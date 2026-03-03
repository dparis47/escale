import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO, dateAujourdhui } from '@/lib/dates'
import { schemaCreerVisite } from '@/schemas/visit'

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
      person:     { select: { id: true, nom: true, prenom: true } },
      saisiePar:  { select: { prenom: true, nom: true } },
      modifiePar: { select: { prenom: true, nom: true } },
      demarches:  true,
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

    // atelierNoms n'est pas encore connu du client Prisma (migrate resolve en attente)
    // → on l'extrait et on le sauvegarde via SQL brut après le create
    const { atelierNoms, ...demarchesPrisma } = demarches ?? {}

    const visite = await prisma.visit.create({
      data: {
        date:        parseISO(date),
        personId:    resolvedPersonId,
        orienteParFT,
        commentaire: commentaire ?? null,
        fse:         fse ?? false,
        saisieParId: Number(session.user.id),
        demarches:   { create: demarchesPrisma },
      },
    })

    if (atelierNoms !== undefined && atelierNoms.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Demarches" SET "atelierNoms" = $1::text[] WHERE "visitId" = $2`,
        atelierNoms, visite.id,
      )
    }

    if (partenaires && partenaires.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Visit" SET "partenaires" = $1::text[] WHERE id = $2`,
        partenaires, visite.id,
      )
    }

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
