import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaCreerPersonne } from '@/schemas/person'

const PAR_PAGE = 50

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q    = searchParams.get('q')?.trim() ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const where = {
    deletedAt: null,
    ...(q.length >= 2
      ? {
          OR: [
            { nom:    { contains: q, mode: 'insensitive' as const } },
            { prenom: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [personnes, total] = await Promise.all([
    prisma.person.findMany({
      where,
      include: {
        _count: {
          select: { visites: { where: { deletedAt: null } } },
        },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      skip:  (page - 1) * PAR_PAGE,
      take:  PAR_PAGE,
    }),
    prisma.person.count({ where }),
  ])

  return NextResponse.json({ personnes, total, page, parPage: PAR_PAGE })
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

  const parsed = schemaCreerPersonne.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const {
    dateNaissance, dateInscriptionFT,
    email,
    ...rest
  } = parsed.data

  const personne = await prisma.person.create({
    data: {
      ...rest,
      email:             email === '' ? null : (email ?? null),
      dateNaissance:     dateNaissance     ? parseISO(dateNaissance)     : null,
      dateInscriptionFT: dateInscriptionFT ? parseISO(dateInscriptionFT) : null,
      dateActualisation: new Date(),
    },
  })

  // Auto-création du dossier individuel (Accompagnement + SuiviEI) pour la nouvelle personne
  const accompDI = await prisma.accompagnement.create({
    data: { personId: personne.id, dateEntree: new Date() },
  })
  await prisma.demarches.create({ data: { accompagnementId: accompDI.id } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).suiviEI.create({ data: { accompagnementId: accompDI.id } })

  return NextResponse.json({ id: personne.id }, { status: 201 })
}
