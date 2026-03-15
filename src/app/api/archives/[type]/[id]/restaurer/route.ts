import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

const TYPES_VALIDES = ['visites', 'personnes', 'accompagnements', 'ateliers'] as const

type Params = { params: Promise<{ type: string; id: string }> }

export async function PATCH(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'archives', 'restaurer')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { type, id: idStr } = await params
  const id = Number(idStr)

  if (!TYPES_VALIDES.includes(type as (typeof TYPES_VALIDES)[number])) {
    return NextResponse.json({ erreur: 'Type invalide' }, { status: 400 })
  }
  if (isNaN(id)) {
    return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })
  }

  const modele = {
    visites: prisma.visit,
    personnes: prisma.person,
    accompagnements: prisma.accompagnement,
    ateliers: prisma.actionCollective,
  }[type as (typeof TYPES_VALIDES)[number]]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entite = await (modele as any).findFirst({
    where: { id, deletedAt: { not: null } },
  })

  if (!entite) {
    return NextResponse.json({ erreur: 'Élément introuvable ou non archivé' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (modele as any).update({
    where: { id },
    data: { deletedAt: null },
  })

  const entiteMap = {
    visites: 'visite',
    personnes: 'personne',
    accompagnements: 'accompagnement',
    ateliers: 'atelier',
  } as const

  logAudit({
    userId: Number(session.user.id),
    action: 'restaurer',
    entite: entiteMap[type as keyof typeof entiteMap],
    entiteId: id,
  })

  return NextResponse.json({ ok: true })
}
