import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'

const PAR_PAGE = 50

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (!peutAcceder(session, 'audit', 'consulter')) return new NextResponse(null, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page      = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const entite    = searchParams.get('entite') ?? undefined
  const action    = searchParams.get('action') ?? undefined
  const userId    = searchParams.get('userId') ? Number(searchParams.get('userId')) : undefined
  const dateDebut = searchParams.get('dateDebut') ?? undefined
  const dateFin   = searchParams.get('dateFin') ?? undefined

  const where: Record<string, unknown> = {}
  if (entite)    where.entite = entite
  if (action)    where.action = action
  if (userId)    where.userId = userId
  if (dateDebut || dateFin) {
    where.createdAt = {
      ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
      ...(dateFin   ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { nom: true, prenom: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    logs: logs.map((l) => ({
      id:        l.id,
      action:    l.action,
      entite:    l.entite,
      entiteId:  l.entiteId,
      details:   l.details,
      userName:  `${l.user.prenom} ${l.user.nom}`,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / PAR_PAGE),
    page,
  })
}
