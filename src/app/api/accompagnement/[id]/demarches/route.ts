import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { schemaMajDemarches } from '@/schemas/accompagnement'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const accompagnement = await prisma.accompagnement.findFirst({
    where: { id: accompagnementId, deletedAt: null },
  })
  if (!accompagnement) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaMajDemarches.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // atelierNoms n'est pas encore connu du client Prisma → sauvegarde via SQL brut
  const { atelierNoms, ...demarchesPrisma } = parsed.data

  const demarches = await prisma.demarches.upsert({
    where:  { accompagnementId },
    create: { accompagnementId, ...demarchesPrisma },
    update: demarchesPrisma,
  })

  if (atelierNoms !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Demarches" SET "atelierNoms" = $1::text[] WHERE id = $2`,
      atelierNoms, demarches.id,
    )

    // Auto-créer une ActionCollective pour chaque nouvel atelier saisi, sans doublon
    // Chercher un thème par défaut pour les ateliers saisis manuellement
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

  return NextResponse.json(demarches)
}
