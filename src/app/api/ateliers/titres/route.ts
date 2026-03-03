import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { THEMES_ATELIER_VALUES } from '@/schemas/atelier'
import type { ThemeAtelier } from '@prisma/client'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const theme = searchParams.get('theme') as ThemeAtelier | null

  if (!theme || !THEMES_ATELIER_VALUES.includes(theme)) {
    return NextResponse.json({ erreur: 'Thème invalide' }, { status: 400 })
  }

  const rows = await prisma.actionCollective.findMany({
    where:    { deletedAt: null, theme, themeAutre: { not: null } },
    select:   { themeAutre: true },
    distinct: ['themeAutre'],
    orderBy:  { themeAutre: 'asc' },
  })

  const titres = rows.map((r) => r.themeAutre as string)
  return NextResponse.json({ titres })
}
