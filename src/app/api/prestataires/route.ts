import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { schemaCreerPrestataire } from '@/schemas/atelier'
import { peutAcceder } from '@/lib/permissions'

// GET — Lister tous les prestataires
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'config_ateliers', 'gerer')) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const prestataires = await prisma.prestataire.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true },
  })

  return NextResponse.json(prestataires)
}

// POST — Créer un prestataire
export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'config_ateliers', 'gerer'))
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const body = await request.json()
  const result = schemaCreerPrestataire.safeParse(body)
  if (!result.success)
    return NextResponse.json({ erreur: result.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })

  const { nom } = result.data

  // Vérifier unicité
  const existant = await prisma.prestataire.findFirst({
    where: { nom, deletedAt: null },
  })
  if (existant)
    return NextResponse.json({ erreur: 'Ce prestataire existe déjà.' }, { status: 409 })

  const prestataire = await prisma.prestataire.create({
    data: { nom },
    select: { id: true, nom: true },
  })

  return NextResponse.json(prestataire, { status: 201 })
}
