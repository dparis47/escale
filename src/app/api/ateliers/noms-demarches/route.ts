import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  // Retourner tous les thèmes actifs groupés par catégorie
  const categoriesDB = await prisma.categorieAtelier.findMany({
    where: { deletedAt: null },
    include: {
      themes: {
        where: { deletedAt: null },
        orderBy: { ordre: 'asc' },
        select: { nom: true },
      },
    },
    orderBy: { ordre: 'asc' },
  })

  const categories = categoriesDB.map((c) => ({
    nom: c.nom,
    themes: c.themes.map((t) => t.nom),
  }))

  return NextResponse.json({ categories })
}
