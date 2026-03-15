import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaAjouterEntretien } from '@/schemas/accompagnement'
import { peutAcceder } from '@/lib/permissions'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eid: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements', 'creer_modifier')) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { eid: eidStr } = await params
  const eid = Number(eidStr)
  if (isNaN(eid)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const entretien = await prisma.entretien.findFirst({ where: { id: eid, deletedAt: null } })
  if (!entretien) return NextResponse.json({ erreur: 'Entretien introuvable' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaAjouterEntretien.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erreur: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const updated = await prisma.entretien.update({
    where: { id: eid },
    data: {
      ...(parsed.data.date   !== undefined ? { date:   parseISO(parsed.data.date) } : {}),
      ...(parsed.data.sujets !== undefined ? { sujets: parsed.data.sujets }         : {}),
      ...(parsed.data.notes  !== undefined ? { notes:  parsed.data.notes ?? null }  : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; eid: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements', 'supprimer')) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { eid: eidStr } = await params
  const eid = Number(eidStr)
  if (isNaN(eid)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const entretien = await prisma.entretien.findFirst({ where: { id: eid, deletedAt: null } })
  if (!entretien) return NextResponse.json({ erreur: 'Entretien introuvable' }, { status: 404 })

  await prisma.entretien.update({ where: { id: eid }, data: { deletedAt: new Date() } })

  return new NextResponse(null, { status: 204 })
}
