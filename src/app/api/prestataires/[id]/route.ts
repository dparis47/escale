import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { schemaMajPrestataire } from '@/schemas/atelier'
import { peutAcceder } from '@/lib/permissions'

// PATCH — Renommer un prestataire
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'config_ateliers', 'gerer'))
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const prestataire = await prisma.prestataire.findFirst({
    where: { id, deletedAt: null },
  })
  if (!prestataire) return NextResponse.json({ erreur: 'Prestataire introuvable' }, { status: 404 })

  const body = await request.json()
  const result = schemaMajPrestataire.safeParse(body)
  if (!result.success)
    return NextResponse.json({ erreur: result.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })

  const { nom } = result.data

  // Vérifier unicité
  if (nom !== prestataire.nom) {
    const existant = await prisma.prestataire.findFirst({
      where: { nom, deletedAt: null, id: { not: id } },
    })
    if (existant)
      return NextResponse.json({ erreur: 'Ce prestataire existe déjà.' }, { status: 409 })
  }

  const maj = await prisma.prestataire.update({
    where: { id },
    data: { nom },
    select: { id: true, nom: true },
  })

  return NextResponse.json(maj)
}

// DELETE — Soft delete d'un prestataire
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'config_ateliers', 'gerer'))
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const prestataire = await prisma.prestataire.findFirst({
    where: { id, deletedAt: null },
  })
  if (!prestataire) return NextResponse.json({ erreur: 'Prestataire introuvable' }, { status: 404 })

  // Vérifier qu'aucun atelier actif ne l'utilise
  const ateliersActifs = await prisma.actionCollective.count({
    where: { prestataireId: id, deletedAt: null },
  })
  if (ateliersActifs > 0)
    return NextResponse.json(
      { erreur: 'Impossible de supprimer un prestataire utilisé par des ateliers.' },
      { status: 409 },
    )

  await prisma.prestataire.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
