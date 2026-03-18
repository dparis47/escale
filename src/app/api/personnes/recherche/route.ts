import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return NextResponse.json([])

  const personnes = await prisma.person.findMany({
    where: {
      deletedAt: null,
      OR: [
        { nom:    { contains: q, mode: 'insensitive' } },
        { prenom: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, nom: true, prenom: true, genre: true },
    take: 10,
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  })

  return NextResponse.json(personnes)
}
