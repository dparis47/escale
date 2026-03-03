import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { THEMES_ATELIER_FR } from '@/schemas/atelier'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const [themesStandards, themesAutre] = await Promise.all([
    prisma.actionCollective.findMany({
      where:    { deletedAt: null, theme: { not: 'AUTRE' } },
      select:   { theme: true },
      distinct: ['theme'],
    }),
    prisma.actionCollective.findMany({
      where:    { deletedAt: null, theme: 'AUTRE', themeAutre: { not: null } },
      select:   { themeAutre: true },
      distinct: ['themeAutre'],
    }),
  ])

  const noms = [
    ...themesStandards.map((r) => THEMES_ATELIER_FR[r.theme]),
    ...themesAutre.map((r) => r.themeAutre as string),
  ].sort((a, b) => a.localeCompare(b, 'fr'))

  return NextResponse.json({ noms })
}
