import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { peutAcceder } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

// $queryRaw retourne des BigInt pour les colonnes entières en Prisma v5
interface Row { personId: bigint; id: bigint; nom: string; prenom: string }

export async function POST(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers', 'gerer_participants')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const atelier = await prisma.actionCollective.findFirst({
    where:  { id, deletedAt: null },
    select: { id: true, participants: { where: { deletedAt: null }, select: { personId: true } } },
  })
  if (!atelier) return NextResponse.json({ erreur: 'Atelier introuvable' }, { status: 404 })

  const dejaInscrits = new Set(atelier.participants.map((p) => p.personId))

  // Personnes avec motif ATELIERS ce jour-là — comparaison DATE=DATE en SQL (aucun problème timezone)
  // ::text[] @> ARRAY[...] pour comparer correctement un tableau d'enums PostgreSQL
  const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT DISTINCT ON (v."personId")
      v."personId", p.id, p.nom, p.prenom
    FROM "Visit" v
    JOIN "Person" p ON p.id = v."personId"
    JOIN "ActionCollective" ac ON ac.date = v.date
    WHERE v."deletedAt"   IS NULL
      AND v."personId"    IS NOT NULL
      AND p."deletedAt"   IS NULL
      AND p."estInscrit"  = true
      AND ac.id           = ${id}
      AND ac."deletedAt"  IS NULL
      AND v.motifs::text[] @> ARRAY['ATELIERS']
    ORDER BY v."personId", p.nom, p.prenom
  `)

  // Conversion BigInt → number pour les comparaisons et les appels Prisma
  const personnes = rows.map((r) => ({
    personId: Number(r.personId),
    nom:      r.nom,
    prenom:   r.prenom,
  }))

  const aInscrire = personnes.filter((r) => !dejaInscrits.has(r.personId))

  const ajouts: { id: number; personId: number; person: { id: number; nom: string; prenom: string } }[] = []

  for (const personne of aInscrire) {
    // Restaurer une participation soft-deleted si elle existe
    const existante = await prisma.participationAtelier.findUnique({
      where: { actionCollectiveId_personId: { actionCollectiveId: id, personId: Number(personne.personId) } },
    })

    if (existante) {
      if (!existante.deletedAt) continue // déjà inscrit (race condition)
      const p = await prisma.participationAtelier.update({
        where:  { id: existante.id },
        data:   { deletedAt: null },
        select: { id: true, personId: true, person: { select: { id: true, nom: true, prenom: true } } },
      })
      ajouts.push(p)
    } else {
      const p = await prisma.participationAtelier.create({
        data:   { actionCollectiveId: id, personId: personne.personId },
        select: { id: true, personId: true, person: { select: { id: true, nom: true, prenom: true } } },
      })
      ajouts.push(p)
    }
  }

  return NextResponse.json({ ajouts })
}
