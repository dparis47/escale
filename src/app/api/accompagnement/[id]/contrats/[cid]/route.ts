import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaContratTravail } from '@/schemas/accompagnement'
import { peutAcceder } from '@/lib/permissions'

async function getPersonIdFromAccompagnement(accompagnementId: number) {
  const a = await prisma.accompagnement.findFirst({
    where:  { id: accompagnementId, deletedAt: null },
    select: { personId: true },
  })
  return a?.personId ?? null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements', 'creer_modifier')) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr, cid: cidStr } = await params
  const accompagnementId = Number(idStr)
  const contratId        = Number(cidStr)
  if (isNaN(accompagnementId) || isNaN(contratId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const personId = await getPersonIdFromAccompagnement(accompagnementId)
  if (personId === null) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  const contrat = await prisma.contratTravail.findFirst({ where: { id: contratId, personId, deletedAt: null } })
  if (!contrat) return NextResponse.json({ erreur: 'Contrat introuvable' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaContratTravail.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erreur: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const updated = await prisma.contratTravail.update({
    where: { id: contratId },
    data: {
      type:      parsed.data.type,
      dateDebut: parseISO(parsed.data.dateDebut),
      dateFin:   parsed.data.dateFin   ? parseISO(parsed.data.dateFin) : null,
      employeur: parsed.data.employeur ?? null,
      ville:     parsed.data.ville     ?? null,
      poste:     parsed.data.poste     ?? null,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements', 'supprimer')) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr, cid: cidStr } = await params
  const accompagnementId = Number(idStr)
  const contratId        = Number(cidStr)
  if (isNaN(accompagnementId) || isNaN(contratId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const personId = await getPersonIdFromAccompagnement(accompagnementId)
  if (personId === null) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  const contrat = await prisma.contratTravail.findFirst({ where: { id: contratId, personId, deletedAt: null } })
  if (!contrat) return NextResponse.json({ erreur: 'Contrat introuvable' }, { status: 404 })

  await prisma.contratTravail.update({ where: { id: contratId }, data: { deletedAt: new Date() } })

  return new NextResponse(null, { status: 204 })
}
