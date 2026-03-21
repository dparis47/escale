import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaMajVisite } from '@/schemas/visit'
import { logAudit } from '@/lib/audit'

/**
 * Supprime physiquement une séance auto-générée si elle n'a plus aucun participant actif.
 * Une séance est considérée auto-générée si elle n'a ni notes, ni lieu, ni prestataire, ni fichiers.
 */
async function nettoyerSeanceOrpheline(actionCollectiveId: number) {
  const seance = await prisma.actionCollective.findFirst({
    where: { id: actionCollectiveId, deletedAt: null },
    include: {
      _count: {
        select: {
          participants: { where: { deletedAt: null } },
          fichiers: true,
          visites: { where: { deletedAt: null, visit: { deletedAt: null } } },
        },
      },
    },
  })
  if (!seance) return

  const estAutoGeneree = !seance.notes && !seance.lieu && !seance.prestataireId && !seance.themeAutre
  const estVide = seance._count.participants === 0 && seance._count.visites === 0

  if (estAutoGeneree && estVide) {
    // Supprimer physiquement les VisiteAtelier orphelins (visites soft-deleted)
    await prisma.visiteAtelier.deleteMany({ where: { actionCollectiveId } })
    // Supprimer physiquement les participations associées
    await prisma.participationAtelier.deleteMany({ where: { actionCollectiveId } })
    // Supprimer physiquement la séance
    await prisma.actionCollective.delete({ where: { id: actionCollectiveId } })
  }
}

async function getVisite(id: number) {
  return prisma.visit.findFirst({
    where: { id, deletedAt: null },
    include: {
      ateliers: {
        where:  { deletedAt: null },
        select: { actionCollectiveId: true },
      },
    },
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const visite = await getVisite(id)
  if (!visite) return NextResponse.json({ erreur: 'Visite introuvable' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaMajVisite.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // genre/nom/prenom appartiennent à Person, pas à Visit
  // partenaires sauvegardé via SQL brut (client Prisma en attente de régénération)
  const { demarches: demarchesData, genre, nom, prenom, partenaires, date, ...visitData } = parsed.data

  // Convertir la date string en Date si fournie
  const dateObj = date ? parseISO(date) : undefined

  // Vérifier l'unicité (personId + date) si la date change
  if (dateObj && dateObj.getTime() !== visite.date.getTime()) {
    const conflit = await prisma.visit.findFirst({
      where: { personId: visite.personId, date: dateObj, deletedAt: null, id: { not: id } },
    })
    if (conflit) {
      return NextResponse.json(
        { erreur: 'Cette personne a déjà une visite enregistrée à cette date.' },
        { status: 409 },
      )
    }
  }

  const updated = await prisma.visit.update({
    where: { id },
    data: {
      ...visitData,
      ...(dateObj ? { date: dateObj } : {}),
      modifieParId: Number(session.user.id),
    },
  })

  if (partenaires !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Visit" SET "partenaires" = $1::text[] WHERE id = $2`,
      partenaires, id,
    )
  }

  // Mise à jour de la Person si la visite est anonyme (estInscrit=false)
  if (genre !== undefined || nom !== undefined || prenom !== undefined) {
    const person = await prisma.person.findFirst({
      where: { id: visite.personId, estInscrit: false, deletedAt: null },
    })
    if (person) {
      await prisma.person.update({
        where: { id: visite.personId },
        data: {
          ...(genre  !== undefined ? { genre } : {}),
          ...(nom    !== undefined ? { nom:    nom?.trim().toUpperCase() ?? 'ANONYME' } : {}),
          ...(prenom !== undefined ? { prenom: prenom?.trim() ?? '' } : {}),
        },
      })
    }
  }

  // Upsert Demarches
  if (demarchesData !== undefined) {
    // Résoudre themeAtelierIds → actionCollectiveIds (trouver ou créer les séances du jour)
    const themeAtelierIds = demarchesData.themeAtelierIds ?? []
    const nouveauxAtelIds: number[] = []
    const dateSeance = dateObj ?? visite.date
    for (const themeId of themeAtelierIds) {
      let seance = await prisma.actionCollective.findFirst({
        where: { themeId, date: dateSeance, deletedAt: null },
        select: { id: true },
      })
      if (!seance) {
        seance = await prisma.actionCollective.create({
          data: { themeId, date: dateSeance },
        })
      }
      nouveauxAtelIds.push(seance.id)
    }

    const { themeAtelierIds: _t, ...demarchesSansTheme } = demarchesData
    const demarchesPersist = {
      ...demarchesSansTheme,
      atelierParticipation: nouveauxAtelIds.length > 0 || !!demarchesData.atelierParticipation,
    }

    await prisma.demarches.upsert({
      where:  { visitId: id },
      create: { visitId: id, ...demarchesPersist },
      update: { ...demarchesPersist },
    })

    // Diff des ateliers : anciens vs nouveaux
    const anciensAtelIds = visite.ateliers.map((a) => a.actionCollectiveId)
    const aRetirer = anciensAtelIds.filter((aid) => !nouveauxAtelIds.includes(aid))
    const aAjouter = nouveauxAtelIds.filter((aid) => !anciensAtelIds.includes(aid))

    // Retirer des ateliers supprimés
    for (const atelId of aRetirer) {
      await prisma.visiteAtelier.updateMany({
        where: { visitId: id, actionCollectiveId: atelId },
        data:  { deletedAt: new Date() },
      })
      await prisma.participationAtelier.updateMany({
        where: { actionCollectiveId: atelId, personId: visite.personId, deletedAt: null },
        data:  { deletedAt: new Date() },
      })
      await nettoyerSeanceOrpheline(atelId)
    }

    // Ajouter aux nouveaux ateliers
    for (const atelId of aAjouter) {
      await prisma.visiteAtelier.upsert({
        where:  { visitId_actionCollectiveId: { visitId: id, actionCollectiveId: atelId } },
        create: { visitId: id, actionCollectiveId: atelId },
        update: { deletedAt: null },
      })
      await prisma.participationAtelier.upsert({
        where:  { actionCollectiveId_personId: { actionCollectiveId: atelId, personId: visite.personId } },
        create: { actionCollectiveId: atelId, personId: visite.personId },
        update: { deletedAt: null },
      })
    }
  }

  logAudit({
    userId: Number(session.user.id),
    action: 'modifier',
    entite: 'visite',
    entiteId: id,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const visite = await getVisite(id)
  if (!visite) return NextResponse.json({ erreur: 'Visite introuvable' }, { status: 404 })

  // Soft delete des participations ateliers de cette visite
  const atelIds = visite.ateliers.map((a) => a.actionCollectiveId)
  for (const atelId of atelIds) {
    await prisma.visiteAtelier.updateMany({
      where: { visitId: id, actionCollectiveId: atelId },
      data:  { deletedAt: new Date() },
    })
    await prisma.participationAtelier.updateMany({
      where: { actionCollectiveId: atelId, personId: visite.personId, deletedAt: null },
      data:  { deletedAt: new Date() },
    })
  }

  await prisma.visit.update({
    where: { id },
    data: { deletedAt: new Date(), modifieParId: Number(session.user.id) },
  })

  // Supprimer les séances auto-générées devenues vides
  for (const atelId of atelIds) {
    await nettoyerSeanceOrpheline(atelId)
  }

  logAudit({
    userId: Number(session.user.id),
    action: 'supprimer',
    entite: 'visite',
    entiteId: id,
  })

  return new NextResponse(null, { status: 204 })
}
