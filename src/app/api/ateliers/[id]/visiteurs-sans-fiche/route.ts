import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

interface Row { nom: string | null; prenom: string | null }

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  // Visiteurs sans fiche (personId IS NULL) ayant le motif ATELIERS le même jour que cet atelier
  // DISTINCT sur (nom, prenom) pour dédupliquer les doublons de saisie
  const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT DISTINCT v.nom, v.prenom
    FROM "Visit" v
    JOIN "ActionCollective" ac ON ac.date = v.date
    WHERE v."deletedAt"  IS NULL
      AND v."personId"   IS NULL
      AND ac.id          = ${id}
      AND ac."deletedAt" IS NULL
      AND v.motifs::text[] @> ARRAY['ATELIERS']
    ORDER BY v.nom, v.prenom
  `)

  return NextResponse.json({ visiteurs: rows })
}
