import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { peutAcceder } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

const schemaAjouterParticipant = z.object({
  personId: z.number().int().positive(),
})

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers', 'gerer_participants')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const atelier = await prisma.actionCollective.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
  if (!atelier) return NextResponse.json({ erreur: 'Atelier introuvable' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaAjouterParticipant.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erreur: 'Données invalides' }, { status: 422 })
  }

  const { personId } = parsed.data

  // Vérifier que la personne existe
  const personne = await prisma.person.findFirst({ where: { id: personId, deletedAt: null }, select: { id: true, nom: true, prenom: true } })
  if (!personne) return NextResponse.json({ erreur: 'Personne introuvable' }, { status: 404 })

  // Vérifier si une participation soft-deleted existe → la restaurer
  const existante = await prisma.participationAtelier.findUnique({
    where: { actionCollectiveId_personId: { actionCollectiveId: id, personId } },
  })

  if (existante) {
    if (!existante.deletedAt) {
      return NextResponse.json({ erreur: 'Cette personne participe déjà à cet atelier' }, { status: 409 })
    }
    // Restaurer la participation supprimée
    const participation = await prisma.participationAtelier.update({
      where: { id: existante.id },
      data:  { deletedAt: null },
      select: { id: true, personId: true, person: { select: { id: true, nom: true, prenom: true } } },
    })
    return NextResponse.json(participation, { status: 201 })
  }

  const participation = await prisma.participationAtelier.create({
    data:   { actionCollectiveId: id, personId },
    select: { id: true, personId: true, person: { select: { id: true, nom: true, prenom: true } } },
  })

  return NextResponse.json(participation, { status: 201 })
}
