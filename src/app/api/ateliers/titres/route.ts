import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const themeIdStr = searchParams.get('themeId')
  const themeId = themeIdStr ? Number(themeIdStr) : NaN

  if (isNaN(themeId) || themeId < 1) {
    return NextResponse.json({ erreur: 'Thème invalide' }, { status: 400 })
  }

  const rows = await prisma.actionCollective.findMany({
    where:    { deletedAt: null, themeId, themeAutre: { not: null } },
    select:   { themeAutre: true },
    distinct: ['themeAutre'],
    orderBy:  { themeAutre: 'asc' },
  })

  const titres = rows.map((r) => r.themeAutre as string)
  return NextResponse.json({ titres })
}
