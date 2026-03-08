import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { schemaCreerCategorie } from '@/schemas/atelier'

// GET — Lister toutes les catégories avec leurs thèmes
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const categories = await prisma.categorieAtelier.findMany({
    where: { deletedAt: null },
    include: {
      themes: {
        where: { deletedAt: null },
        orderBy: { ordre: 'asc' },
        select: { id: true, nom: true, ordre: true },
      },
    },
    orderBy: { ordre: 'asc' },
  })

  return NextResponse.json(categories)
}

// POST — Créer une catégorie avec ses thèmes
export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL')
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const body = await request.json()
  const result = schemaCreerCategorie.safeParse(body)
  if (!result.success)
    return NextResponse.json({ erreur: result.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })

  const { nom, couleur, themes, apresOrdre } = result.data

  // Vérifier unicité du nom
  const existante = await prisma.categorieAtelier.findFirst({
    where: { nom, deletedAt: null },
  })
  if (existante)
    return NextResponse.json({ erreur: 'Une catégorie avec ce nom existe déjà.' }, { status: 409 })

  // Déterminer l'ordre
  let ordre: number
  if (apresOrdre !== undefined) {
    // Insérer juste après la catégorie spécifiée : décaler les suivantes
    ordre = apresOrdre + 1
    await prisma.categorieAtelier.updateMany({
      where: { ordre: { gte: ordre }, deletedAt: null },
      data:  { ordre: { increment: 1 } },
    })
  } else {
    // Ajouter à la fin
    const derniere = await prisma.categorieAtelier.findFirst({
      where: { deletedAt: null },
      orderBy: { ordre: 'desc' },
      select: { ordre: true },
    })
    ordre = (derniere?.ordre ?? 0) + 1
  }

  const categorie = await prisma.categorieAtelier.create({
    data: {
      nom,
      couleur,
      ordre,
      themes: {
        create: themes.map((t, i) => ({ nom: t, ordre: i + 1 })),
      },
    },
    include: {
      themes: {
        where: { deletedAt: null },
        orderBy: { ordre: 'asc' },
        select: { id: true, nom: true, ordre: true },
      },
    },
  })

  return NextResponse.json(categorie, { status: 201 })
}
