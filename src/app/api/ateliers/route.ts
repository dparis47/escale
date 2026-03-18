import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaCreerAtelier } from '@/schemas/atelier'
import { peutAcceder } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

const PAR_PAGE = 50

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const q    = searchParams.get('q')?.trim() ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const where = q.length >= 2
    ? {
        deletedAt: null,
        OR: [
          { themeRef: { nom: { contains: q, mode: 'insensitive' as const } } },
          { lieu: { contains: q, mode: 'insensitive' as const } },
          { prestataire: { nom: { contains: q, mode: 'insensitive' as const } } },
          { themeRef: { categorie: { nom: { contains: q, mode: 'insensitive' as const } } } },
        ],
      }
    : { deletedAt: null }

  const [ateliers, total] = await Promise.all([
    prisma.actionCollective.findMany({
      where,
      include: {
        themeRef: { include: { categorie: true } },
        prestataire: true,
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
  if (!peutAcceder(session, 'ateliers', 'creer_modifier')) {
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

  const { themeId, prestataireId, lieu, seances, notes } = parsed.data

  // Vérifier que le thème existe
  const theme = await prisma.themeAtelierRef.findFirst({ where: { id: themeId, deletedAt: null } })
  if (!theme) return NextResponse.json({ erreur: 'Thème introuvable' }, { status: 400 })

  if (prestataireId) {
    const presta = await prisma.prestataire.findFirst({ where: { id: prestataireId, deletedAt: null } })
    if (!presta) return NextResponse.json({ erreur: 'Prestataire introuvable' }, { status: 400 })
  }

  await prisma.actionCollective.createMany({
    data: seances.map((s) => ({
      themeId,
      themeAutre:    s.themeAutre || null,
      prestataireId: prestataireId || null,
      lieu:          lieu          || null,
      date:          parseISO(s.date),
      notes:         notes         || null,
      saisieParId:   Number(session.user.id),
    })),
  })

  logAudit({
    userId: Number(session.user.id),
    action: 'creer',
    entite: 'atelier',
    entiteId: 0,
    details: `Création de ${seances.length} séance(s)`,
  })

  return NextResponse.json({ count: seances.length }, { status: 201 })
}
