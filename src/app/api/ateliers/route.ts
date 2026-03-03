import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaCreerAtelier, THEMES_ATELIER_FR } from '@/schemas/atelier'
import type { ThemeAtelier } from '@prisma/client'

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

  // Filtre : recherche sur le label FR du thème ou sur le lieu
  // Comme le thème est un enum, on filtre sur les valeurs dont le label contient q
  const themesMatchants = q.length >= 2
    ? (Object.entries(THEMES_ATELIER_FR) as [ThemeAtelier, string][])
        .filter(([, label]) => label.toLowerCase().includes(q.toLowerCase()))
        .map(([theme]) => theme)
    : []

  const where = q.length >= 2
    ? {
        deletedAt: null,
        OR: [
          ...(themesMatchants.length > 0 ? [{ theme: { in: themesMatchants } }] : []),
          { lieu: { contains: q, mode: 'insensitive' as const } },
          { prestataire: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : { deletedAt: null }

  const [ateliers, total] = await Promise.all([
    prisma.actionCollective.findMany({
      where,
      include: {
        _count: { select: { participants: { where: { deletedAt: null } } } },
      },
      orderBy: { date: 'desc' },
      skip:    (page - 1) * PAR_PAGE,
      take:    PAR_PAGE,
    }),
    prisma.actionCollective.count({ where }),
  ])

  return NextResponse.json({ ateliers, total, page, totalPages: Math.ceil(total / PAR_PAGE) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaCreerAtelier.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erreur: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const { theme, prestataire, lieu, seances, notes } = parsed.data

  await prisma.actionCollective.createMany({
    data: seances.map((s) => ({
      theme,
      themeAutre:  s.themeAutre || null,
      prestataire: prestataire  || null,
      lieu:        lieu         || null,
      date:        parseISO(s.date),
      notes:       notes        || null,
    })),
  })

  return NextResponse.json({ count: seances.length }, { status: 201 })
}
