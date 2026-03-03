import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaContratTravail } from '@/schemas/accompagnement'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const accompagnement = await prisma.accompagnement.findFirst({
    where: { id: accompagnementId, deletedAt: null },
    select: { personId: true },
  })
  if (!accompagnement) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaContratTravail.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erreur: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const contrat = await prisma.contratTravail.create({
    data: {
      personId:  accompagnement.personId,
      type:      parsed.data.type,
      dateDebut: parseISO(parsed.data.dateDebut),
      dateFin:   parsed.data.dateFin   ? parseISO(parsed.data.dateFin) : null,
      employeur: parsed.data.employeur ?? null,
      ville:     parsed.data.ville     ?? null,
      poste:     parsed.data.poste     ?? null,
    },
  })

  return NextResponse.json(contrat, { status: 201 })
}
