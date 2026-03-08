import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { schemaMajVisite } from '@/schemas/visit'

async function getVisite(id: number) {
  return prisma.visit.findFirst({ where: { id, deletedAt: null } })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const visite = await getVisite(id)
  if (!visite) return NextResponse.json({ erreur: 'Visite introuvable' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaMajVisite.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // genre/nom/prenom appartiennent à Person, pas à Visit
  // partenaires sauvegardé via SQL brut (client Prisma en attente de régénération)
  const { demarches: demarchesData, genre, nom, prenom, partenaires, ...visitData } = parsed.data

  const updated = await prisma.visit.update({
    where: { id },
    data: {
      ...visitData,
      modifieParId: Number(session.user.id),
    },
  })

  if (partenaires !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Visit" SET "partenaires" = $1::text[] WHERE id = $2`,
      partenaires, id,
    )
  }

  // Mise à jour de la Person si la visite est anonyme (estInscrit=false)
  if (genre !== undefined || nom !== undefined || prenom !== undefined) {
    const person = await prisma.person.findFirst({
      where: { id: visite.personId, estInscrit: false, deletedAt: null },
    })
    if (person) {
      await prisma.person.update({
        where: { id: visite.personId },
        data: {
          ...(genre  !== undefined ? { genre } : {}),
          ...(nom    !== undefined ? { nom:    nom?.trim().toUpperCase() ?? 'ANONYME' } : {}),
          ...(prenom !== undefined ? { prenom: prenom?.trim() ?? '' } : {}),
        },
      })
    }
  }

  // Upsert Demarches
  // atelierNoms n'est pas encore connu du client Prisma → sauvegarde via SQL brut
  if (demarchesData !== undefined) {
    const { atelierNoms, ...demarchesPrisma } = demarchesData
    const dem = await prisma.demarches.upsert({
      where:  { visitId: id },
      create: { visitId: id, ...demarchesPrisma },
      update: { ...demarchesPrisma },
    })
    if (atelierNoms !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Demarches" SET "atelierNoms" = $1::text[] WHERE id = $2`,
        atelierNoms, dem.id,
      )

      // Auto-créer une ActionCollective pour chaque nouvel atelier saisi
      const themeFallback = await prisma.themeAtelierRef.findFirst({
        where: { deletedAt: null },
        orderBy: { id: 'asc' },
      })
      if (themeFallback) {
        for (const nom of atelierNoms) {
          const existe = await prisma.actionCollective.findFirst({
            where: { themeAutre: nom, deletedAt: null },
          })
          if (!existe) {
            await prisma.actionCollective.create({
              data: { themeId: themeFallback.id, themeAutre: nom, date: new Date() },
            })
          }
        }
      }
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const visite = await getVisite(id)
  if (!visite) return NextResponse.json({ erreur: 'Visite introuvable' }, { status: 404 })

  await prisma.visit.update({
    where: { id },
    data: { deletedAt: new Date(), modifieParId: Number(session.user.id) },
  })

  return new NextResponse(null, { status: 204 })
}
