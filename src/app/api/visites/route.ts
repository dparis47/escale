import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO, dateAujourdhui } from '@/lib/dates'
import { schemaCreerVisite } from '@/schemas/visit'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateISO = searchParams.get('date') ?? dateAujourdhui()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return NextResponse.json({ erreur: 'Format de date invalide' }, { status: 400 })
  }

  const visites = await prisma.visit.findMany({
    where: { date: parseISO(dateISO), deletedAt: null },
    include: {
      person:     { select: { id: true, nom: true, prenom: true, genre: true, estInscrit: true } },
      saisiePar:  { select: { prenom: true, nom: true } },
      modifiePar: { select: { prenom: true, nom: true } },
      demarches:  { include: { actionCollective: { select: { themeId: true, themeRef: { select: { nom: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(visites)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaCreerVisite.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const {
    date, genre, personId, nom, prenom,
    orienteParFT, partenaires, commentaire,
    demarches,
    fse,
  } = parsed.data

  try {
    // Si aucun personId : auto-créer une Person minimale (sans fiche → estInscrit=false)
    let resolvedPersonId = personId
    if (!resolvedPersonId) {
      if (!genre) {
        return NextResponse.json(
          { erreur: 'genre requis pour une visite sans fiche' },
          { status: 422 },
        )
      }
      const person = await prisma.person.create({
        data: {
          nom:        nom?.trim().toUpperCase() ?? 'ANONYME',
          prenom:     prenom?.trim() ?? '',
          genre,
          estInscrit: false,
        },
      })
      resolvedPersonId = person.id
    }

    // Résoudre themeAtelierId → actionCollectiveId (trouver ou créer la séance du jour)
    let actionCollectiveIdResolu = demarches?.actionCollectiveId ?? null
    if (demarches?.themeAtelierId) {
      const dateSeance = parseISO(date)
      let seance = await prisma.actionCollective.findFirst({
        where: { themeId: demarches.themeAtelierId, date: dateSeance, deletedAt: null },
        select: { id: true },
      })
      if (!seance) {
        seance = await prisma.actionCollective.create({
          data: { themeId: demarches.themeAtelierId, date: dateSeance },
        })
      }
      actionCollectiveIdResolu = seance.id
    }
    // Construire les démarches pour persistence (sans themeAtelierId, avec actionCollectiveId résolu)
    const { themeAtelierId: _t, ...demarchesSansTheme } = demarches ?? {}
    const demarchesPersist = {
      ...demarchesSansTheme,
      actionCollectiveId: actionCollectiveIdResolu,
      atelierParticipation: !!actionCollectiveIdResolu || !!demarches?.atelierParticipation,
    }

    const visite = await prisma.visit.create({
      data: {
        date:        parseISO(date),
        personId:    resolvedPersonId,
        orienteParFT,
        partenaires: partenaires ?? [],
        commentaire: commentaire ?? null,
        fse:         fse ?? false,
        saisieParId: Number(session.user.id),
        demarches:   { create: demarchesPersist },
      },
    })

    // Ajout automatique comme participant à l'atelier
    const atelId = demarchesPersist.actionCollectiveId
    if (atelId && resolvedPersonId) {
      await prisma.participationAtelier.upsert({
        where: {
          actionCollectiveId_personId: {
            actionCollectiveId: atelId,
            personId: resolvedPersonId,
          },
        },
        create: {
          actionCollectiveId: atelId,
          personId: resolvedPersonId,
        },
        update: { deletedAt: null },
      })
    }

    if (partenaires && partenaires.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Visit" SET "partenaires" = $1::text[] WHERE id = $2`,
        partenaires, visite.id,
      )
    }

    // Auto-création du dossier individuel (SuiviEI) si la personne n'en a pas encore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existeDI = await (prisma as any).suiviEI.findFirst({
      where: {
        accompagnement: { personId: resolvedPersonId, deletedAt: null },
      },
      select: { id: true },
    })
    if (!existeDI) {
      const accompDI = await prisma.accompagnement.create({
        data: { personId: resolvedPersonId, dateEntree: parseISO(date) },
      })
      await prisma.demarches.create({ data: { accompagnementId: accompDI.id } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).suiviEI.create({ data: { accompagnementId: accompDI.id } })
    }

    logAudit({
      userId: Number(session.user.id),
      action: 'creer',
      entite: 'visite',
      entiteId: visite.id,
      details: nom || prenom ? `${nom ?? ''} ${prenom ?? ''}`.trim() : undefined,
    })

    return NextResponse.json(visite, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json(
        { erreur: 'Cette personne a déjà une visite enregistrée ce jour.' },
        { status: 409 },
      )
    }
    console.error(e)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
