import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaMajAccompagnement } from '@/schemas/accompagnement'
import { peutAcceder } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

async function getAccompagnement(id: number) {
  return prisma.accompagnement.findFirst({ where: { id, deletedAt: null } })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  if (!peutAcceder(session, 'accompagnements')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const accompagnement = await prisma.accompagnement.findFirst({
    where: { id, deletedAt: null },
    include: {
      saisiePar:  { select: { prenom: true, nom: true } },
      modifiePar: { select: { prenom: true, nom: true } },
      person:   { select: { id: true, nom: true, prenom: true, genre: true, dateNaissance: true } },
      sortie:   true,
      demarches: true,
      entretiens: {
        where:   { deletedAt: null },
        orderBy: { date: 'desc' },
      },
      suiviASID: {
        include: {
          prescriptions: { select: { id: true, nom: true } },

        },
      },
    },
  })

  if (!accompagnement) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  return NextResponse.json(accompagnement)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  if (!peutAcceder(session, 'accompagnements', 'creer_modifier')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const accompagnement = await getAccompagnement(id)
  if (!accompagnement) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaMajAccompagnement.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const {
    dateEntree, dateSortie, dateRenouvellementFSE, dateRenouvellementFSE2,
    ressourceRSA, ressourceASS, ressourceARE, ressourceAAH,
    ressourceASI, ressourceSansRessources,
    avantOccupeEmploi, avantCDI, avantCDDPlus6Mois, avantCDDMoins6Mois,
    avantInterim, avantIAE, avantIndependant, avantFormationPro,
    avantEnRechercheEmploi, avantNeCherchePasEmploi,
    niveauFormation, reconnaissanceHandicap,
    logementSDF, logementExclusion,
    observation, estBrouillon,
  } = parsed.data

  const updated = await prisma.accompagnement.update({
    where: { id },
    data: {
      modifieParId: Number(session.user.id),
      ...(dateEntree             !== undefined ? { dateEntree: parseISO(dateEntree) }        : {}),
      ...(dateSortie             !== undefined ? { dateSortie: dateSortie ? parseISO(dateSortie) : null } : {}),
      ...(dateRenouvellementFSE  !== undefined ? { dateRenouvellementFSE:  dateRenouvellementFSE  ? parseISO(dateRenouvellementFSE)  : null } : {}),
      ...(dateRenouvellementFSE2 !== undefined ? { dateRenouvellementFSE2: dateRenouvellementFSE2 ? parseISO(dateRenouvellementFSE2) : null } : {}),
      ...(observation            !== undefined ? { observation }                             : {}),
      ...(ressourceRSA           !== undefined ? { ressourceRSA }                           : {}),
      ...(ressourceASS           !== undefined ? { ressourceASS }                           : {}),
      ...(ressourceARE           !== undefined ? { ressourceARE }                           : {}),
      ...(ressourceAAH           !== undefined ? { ressourceAAH }                           : {}),
      ...(ressourceASI           !== undefined ? { ressourceASI }                           : {}),
      ...(ressourceSansRessources !== undefined ? { ressourceSansRessources }               : {}),
      ...(avantOccupeEmploi      !== undefined ? { avantOccupeEmploi }                      : {}),
      ...(avantCDI               !== undefined ? { avantCDI }                               : {}),
      ...(avantCDDPlus6Mois      !== undefined ? { avantCDDPlus6Mois }                      : {}),
      ...(avantCDDMoins6Mois     !== undefined ? { avantCDDMoins6Mois }                     : {}),
      ...(avantInterim           !== undefined ? { avantInterim }                            : {}),
      ...(avantIAE               !== undefined ? { avantIAE }                               : {}),
      ...(avantIndependant       !== undefined ? { avantIndependant }                        : {}),
      ...(avantFormationPro      !== undefined ? { avantFormationPro }                       : {}),
      ...(avantEnRechercheEmploi !== undefined ? { avantEnRechercheEmploi }                 : {}),
      ...(avantNeCherchePasEmploi !== undefined ? { avantNeCherchePasEmploi }               : {}),
      ...(niveauFormation        !== undefined ? { niveauFormation: niveauFormation ?? null } : {}),
      ...(reconnaissanceHandicap !== undefined ? { reconnaissanceHandicap }                  : {}),
      ...(logementSDF            !== undefined ? { logementSDF }                             : {}),
      ...(logementExclusion      !== undefined ? { logementExclusion }                       : {}),
      ...(estBrouillon           !== undefined ? { estBrouillon }                            : {}),
    },
  })

  logAudit({
    userId: Number(session.user.id),
    action: 'modifier',
    entite: 'accompagnement',
    entiteId: id,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  if (!peutAcceder(session, 'accompagnements', 'supprimer')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const accompagnement = await getAccompagnement(id)
  if (!accompagnement) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.accompagnement.update({ where: { id }, data: { deletedAt: now } })
    // Soft delete du SuiviASID s'il existe
    const suivi = await tx.suiviASID.findUnique({ where: { accompagnementId: id } })
    if (suivi) {
      await tx.suiviASID.update({ where: { id: suivi.id }, data: { deletedAt: now } })
    }
  })

  logAudit({
    userId: Number(session.user.id),
    action: 'supprimer',
    entite: 'accompagnement',
    entiteId: id,
  })

  return new NextResponse(null, { status: 204 })
}
