import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaAjouterEntretien } from '@/schemas/accompagnement'
import { peutAcceder } from '@/lib/permissions'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements')) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const entretiens = await prisma.entretien.findMany({
    where:   { accompagnementId, deletedAt: null },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(entretiens)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements', 'creer_modifier')) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const accompagnement = await prisma.accompagnement.findFirst({
    where: { id: accompagnementId, deletedAt: null },
  })
  if (!accompagnement) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaAjouterEntretien.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erreur: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const entretien = await prisma.entretien.create({
    data: {
      accompagnementId,
      date:   parseISO(parsed.data.date),
      sujets: parsed.data.sujets,
      notes:  parsed.data.notes ?? null,
    },
  })

  return NextResponse.json(entretien, { status: 201 })
}
