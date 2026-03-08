import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { schemaMajCategorie } from '@/schemas/atelier'

// PATCH — Modifier une catégorie (nom, couleur, thèmes)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL')
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const categorie = await prisma.categorieAtelier.findFirst({
    where: { id, deletedAt: null },
  })
  if (!categorie) return NextResponse.json({ erreur: 'Catégorie introuvable' }, { status: 404 })

  const body = await request.json()
  const result = schemaMajCategorie.safeParse(body)
  if (!result.success)
    return NextResponse.json({ erreur: result.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })

  const { nom, couleur, themesAjoutes, themesRenommes, themesSupprimes } = result.data

  // Vérifier unicité du nom si modifié
  if (nom && nom !== categorie.nom) {
    const existante = await prisma.categorieAtelier.findFirst({
      where: { nom, deletedAt: null, id: { not: id } },
    })
    if (existante)
      return NextResponse.json({ erreur: 'Une catégorie avec ce nom existe déjà.' }, { status: 409 })
  }

  // Transaction pour toutes les modifications
  await prisma.$transaction(async (tx) => {
    // Mettre à jour la catégorie
    if (nom || couleur) {
      await tx.categorieAtelier.update({
        where: { id },
        data: {
          ...(nom     ? { nom }     : {}),
          ...(couleur ? { couleur } : {}),
        },
      })
    }

    // Supprimer des thèmes (soft delete)
    if (themesSupprimes && themesSupprimes.length > 0) {
      // Vérifier qu'aucun atelier actif n'utilise ces thèmes
      const ateliersActifs = await tx.actionCollective.count({
        where: {
          themeId: { in: themesSupprimes },
          deletedAt: null,
        },
      })
      if (ateliersActifs > 0) {
        throw new Error('Impossible de supprimer un thème utilisé par des ateliers actifs.')
      }
      await tx.themeAtelierRef.updateMany({
        where: { id: { in: themesSupprimes }, categorieId: id },
        data: { deletedAt: new Date() },
      })
    }

    // Renommer des thèmes
    if (themesRenommes && themesRenommes.length > 0) {
      for (const t of themesRenommes) {
        await tx.themeAtelierRef.update({
          where: { id: t.id },
          data: { nom: t.nom },
        })
      }
    }

    // Ajouter des thèmes
    if (themesAjoutes && themesAjoutes.length > 0) {
      const dernier = await tx.themeAtelierRef.findFirst({
        where: { categorieId: id, deletedAt: null },
        orderBy: { ordre: 'desc' },
        select: { ordre: true },
      })
      const ordreBase = (dernier?.ordre ?? 0) + 1
      await tx.themeAtelierRef.createMany({
        data: themesAjoutes.map((nom, i) => ({
          nom,
          categorieId: id,
          ordre: ordreBase + i,
        })),
      })
    }
  })

  // Retourner la catégorie mise à jour
  const maj = await prisma.categorieAtelier.findUnique({
    where: { id },
    include: {
      themes: {
        where: { deletedAt: null },
        orderBy: { ordre: 'asc' },
        select: { id: true, nom: true, ordre: true },
      },
    },
  })

  return NextResponse.json(maj)
}

// DELETE — Soft delete d'une catégorie
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL')
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  // Vérifier que la catégorie existe
  const categorie = await prisma.categorieAtelier.findFirst({
    where: { id, deletedAt: null },
    include: { themes: { where: { deletedAt: null }, select: { id: true } } },
  })
  if (!categorie) return NextResponse.json({ erreur: 'Catégorie introuvable' }, { status: 404 })

  // Vérifier qu'aucun atelier actif n'utilise les thèmes de cette catégorie
  const themeIds = categorie.themes.map((t) => t.id)
  if (themeIds.length > 0) {
    const ateliersActifs = await prisma.actionCollective.count({
      where: { themeId: { in: themeIds }, deletedAt: null },
    })
    if (ateliersActifs > 0)
      return NextResponse.json(
        { erreur: 'Impossible de supprimer une catégorie dont les thèmes sont utilisés par des ateliers.' },
        { status: 409 },
      )
  }

  // Soft delete catégorie + ses thèmes
  const now = new Date()
  await prisma.$transaction([
    prisma.themeAtelierRef.updateMany({
      where: { categorieId: id, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.categorieAtelier.update({
      where: { id },
      data: { deletedAt: now },
    }),
  ])

  return NextResponse.json({ ok: true })
}
