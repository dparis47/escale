import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaCreerAccompagnement } from '@/schemas/accompagnement'

const PAR_PAGE = 50

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const q    = searchParams.get('q')?.trim() ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const where = {
    deletedAt: null,
    // Exclure les dossiers individuels (EI) — seuls FSE+ et ASID
    suiviEI: null,
    ...(q.length >= 2
      ? {
          person: {
            OR: [
              { nom:    { contains: q, mode: 'insensitive' as const } },
              { prenom: { contains: q, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accompagnements, total] = await Promise.all([
    (prisma.accompagnement.findMany as any)({
      where,
      include: {
        person:   { select: { id: true, nom: true, prenom: true } },
        suiviASID: { select: { id: true } },
      },
      orderBy: { dateEntree: 'desc' },
      skip:    (page - 1) * PAR_PAGE,
      take:    PAR_PAGE,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.accompagnement.count({ where: where as any }),
  ])

  return NextResponse.json({ accompagnements, total })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaCreerAccompagnement.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const {
    personId,
    personneNom, personnePrenom, personneGenre, personneDateNaissance,
    dateEntree, dateSortie,
    ressourceRSA, ressourceASS, ressourceARE, ressourceAAH,
    ressourceASI, ressourceSansRessources,
    avantOccupeEmploi, avantCDI, avantCDDPlus6Mois, avantCDDMoins6Mois,
    avantInterim, avantIAE, avantIndependant, avantFormationPro,
    avantEnRechercheEmploi, avantNeCherchePasEmploi,
    niveauFormation, reconnaissanceHandicap,
    logementSDF, logementExclusion,
    observation,
    suiviASID: suiviASIDData,
  } = parsed.data

  // Résoudre la personne (existante ou création inline)
  let resolvedPersonId: number
  if (personId) {
    const personne = await prisma.person.findFirst({ where: { id: personId, deletedAt: null } })
    if (!personne) return NextResponse.json({ erreur: 'Personne introuvable' }, { status: 404 })
    resolvedPersonId = personId
  } else {
    if (!personneNom || !personnePrenom || !personneGenre) {
      return NextResponse.json({ erreur: 'Nom, prénom et genre requis pour créer une personne' }, { status: 422 })
    }
    const nouvellePers = await prisma.person.create({
      data: {
        nom:              personneNom,
        prenom:           personnePrenom,
        genre:            personneGenre,
        dateNaissance:    personneDateNaissance ? parseISO(personneDateNaissance) : null,
        estInscrit:       false,
      },
    })
    resolvedPersonId = nouvellePers.id
  }

  // Transaction : Accompagnement + optionnellement SuiviASID + Demarches
  const accompagnement = await prisma.$transaction(async (tx) => {
    const created = await tx.accompagnement.create({
      data: {
        personId:   resolvedPersonId,
        dateEntree: parseISO(dateEntree),
        dateSortie: dateSortie ? parseISO(dateSortie) : null,
        ressourceRSA,
        ressourceASS,
        ressourceARE,
        ressourceAAH,
        ressourceASI,
        ressourceSansRessources,
        avantOccupeEmploi,
        avantCDI,
        avantCDDPlus6Mois,
        avantCDDMoins6Mois,
        avantInterim,
        avantIAE,
        avantIndependant,
        avantFormationPro,
        avantEnRechercheEmploi,
        avantNeCherchePasEmploi,
        niveauFormation:       niveauFormation ?? null,
        reconnaissanceHandicap,
        logementSDF,
        logementExclusion,
        observation: observation ?? null,
      },
    })

    // Créer les démarches vides liées à l'accompagnement
    await tx.demarches.create({ data: { accompagnementId: created.id } })

    // Créer le SuiviASID si demandé
    if (suiviASIDData) {
      const {
        prescripteurNom, prescripteurPrenom,
        referentNom, referentPrenom, communeResidence,
        dateEntree: asidDateEntree,
        dateRenouvellement, dateRenouvellement2, dateSortie: asidDateSortie,
        orientationNMoins1, orientationN, renouvellementN, suiviNMoins2EnCours,
        suiviRealise, suiviNonRealiseRaison,
        reorientation, reorientationDescription,
        observation: asidObservation,
      } = suiviASIDData

      await tx.suiviASID.create({
        data: {
          accompagnementId:    created.id,
          prescripteurNom:     prescripteurNom    ?? null,
          prescripteurPrenom:  prescripteurPrenom ?? null,
          referentNom:         referentNom        ?? null,
          referentPrenom:      referentPrenom     ?? null,
          communeResidence:    communeResidence   ?? null,
          dateEntree:          parseISO(asidDateEntree),
          dateRenouvellement:  dateRenouvellement  ? parseISO(dateRenouvellement)  : null,
          dateRenouvellement2: dateRenouvellement2 ? parseISO(dateRenouvellement2) : null,
          dateSortie:          asidDateSortie      ? parseISO(asidDateSortie)      : null,
          orientationNMoins1:  orientationNMoins1  ?? false,
          orientationN:        orientationN        ?? false,
          renouvellementN:     renouvellementN     ?? 0,
          suiviNMoins2EnCours: suiviNMoins2EnCours ?? false,
          suiviRealise:        suiviRealise        ?? true,
          suiviNonRealiseRaison:    suiviNonRealiseRaison    ?? null,
          reorientation:            reorientation            ?? false,
          reorientationDescription: reorientationDescription ?? null,
          observation:              asidObservation          ?? null,
        },
      })
    }

    return created
  })

  return NextResponse.json({ id: accompagnement.id }, { status: 201 })
}
