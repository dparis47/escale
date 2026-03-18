import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'

export type SeanceDuJour = {
  id:          number
  theme:       string
  titre:       string | null
  prestataire: string | null
  label:       string
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateISO = searchParams.get('date')
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return NextResponse.json({ erreur: 'Paramètre date requis (YYYY-MM-DD)' }, { status: 400 })
  }

  const seances = await prisma.actionCollective.findMany({
    where: { date: parseISO(dateISO), deletedAt: null },
    include: {
      themeRef: { include: { categorie: true } },
      prestataire: true,
    },
    orderBy: [
      { themeRef: { categorie: { ordre: 'asc' } } },
      { themeRef: { ordre: 'asc' } },
    ],
  })

  const result: SeanceDuJour[] = seances.map((s) => {
    const theme = s.themeRef.nom
    const titre = s.themeAutre ?? null
    const prestataire = s.prestataire?.nom ?? null

    let label = theme
    if (titre) label += ` — ${titre}`
    if (prestataire) label += ` (${prestataire})`

    return { id: s.id, theme, titre, prestataire, label }
  })

  return NextResponse.json({ seances: result })
}
