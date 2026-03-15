import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  // Visiteurs sans fiche (estInscrit=false) ayant participé à cet atelier
  // DISTINCT sur personId pour dédupliquer
  const rows = await prisma.visit.findMany({
    where: {
      deletedAt: null,
      person: { estInscrit: false },
      demarches: {
        atelierParticipation: true,
        actionCollectiveId: id,
      },
    },
    select: {
      person: { select: { nom: true, prenom: true } },
    },
    distinct: ['personId'],
  })

  const visiteurs = rows.map((r) => ({ nom: r.person.nom, prenom: r.person.prenom }))

  return NextResponse.json({ visiteurs })
}
