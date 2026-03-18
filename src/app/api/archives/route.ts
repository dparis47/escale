import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'

const TYPES_VALIDES = ['visites', 'personnes', 'accompagnements', 'ateliers'] as const
type TypeArchive = (typeof TYPES_VALIDES)[number]

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'archives', 'voir')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as TypeArchive | null

  if (type && !TYPES_VALIDES.includes(type)) {
    return NextResponse.json({ erreur: 'Type invalide' }, { status: 400 })
  }

  const resultats: Record<string, unknown[]> = {}

  if (!type || type === 'visites') {
    resultats.visites = await prisma.visit.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        date: true,
        deletedAt: true,
        person: { select: { id: true, nom: true, prenom: true, estInscrit: true } },
      },
      orderBy: { deletedAt: 'desc' },
      take: 100,
    })
  }

  if (!type || type === 'personnes') {
    resultats.personnes = await prisma.person.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        nom: true,
        prenom: true,
        deletedAt: true,
      },
      orderBy: { deletedAt: 'desc' },
      take: 100,
    })
  }

  if (!type || type === 'accompagnements') {
    resultats.accompagnements = await prisma.accompagnement.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        dateEntree: true,
        deletedAt: true,
        person: { select: { id: true, nom: true, prenom: true } },
        suiviASID: { select: { id: true } },
      },
      orderBy: { deletedAt: 'desc' },
      take: 100,
    })
  }

  if (!type || type === 'ateliers') {
    resultats.ateliers = await prisma.actionCollective.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        date: true,
        deletedAt: true,
        themeRef: {
          select: {
            nom: true,
            categorie: { select: { nom: true } },
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
      take: 100,
    })
  }

  // Enrichir avec le nom de l'utilisateur qui a supprimé (depuis AuditLog)
  const entites: { entite: string; ids: number[] }[] = []
  if (resultats.visites) entites.push({ entite: 'visite', ids: (resultats.visites as { id: number }[]).map((v) => v.id) })
  if (resultats.personnes) entites.push({ entite: 'personne', ids: (resultats.personnes as { id: number }[]).map((p) => p.id) })
  if (resultats.accompagnements) entites.push({ entite: 'accompagnement', ids: (resultats.accompagnements as { id: number }[]).map((a) => a.id) })
  if (resultats.ateliers) entites.push({ entite: 'atelier', ids: (resultats.ateliers as { id: number }[]).map((a) => a.id) })

  // Récupérer tous les logs de suppression pertinents en une seule requête
  const allIds = entites.flatMap((e) => e.ids)
  const allEntiteNames = entites.map((e) => e.entite)

  const logsSuppr = allIds.length > 0
    ? await prisma.auditLog.findMany({
        where: {
          action: 'supprimer',
          entite: { in: allEntiteNames },
          entiteId: { in: allIds },
        },
        select: { entite: true, entiteId: true, user: { select: { prenom: true, nom: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : []

  // Indexer : clé "entite-id" → nom utilisateur (premier trouvé = plus récent)
  const supprPar = new Map<string, string>()
  for (const log of logsSuppr) {
    const cle = `${log.entite}-${log.entiteId}`
    if (!supprPar.has(cle)) {
      supprPar.set(cle, `${log.user.prenom} ${log.user.nom}`)
    }
  }

  // Ajouter supprimePar à chaque élément
  function enrichir(liste: unknown[], entiteNom: string) {
    for (const item of liste as (Record<string, unknown>)[]) {
      const cle = `${entiteNom}-${item.id}`
      item.supprimePar = supprPar.get(cle) ?? null
    }
  }

  if (resultats.visites) enrichir(resultats.visites, 'visite')
  if (resultats.personnes) enrichir(resultats.personnes, 'personne')
  if (resultats.accompagnements) enrichir(resultats.accompagnements, 'accompagnement')
  if (resultats.ateliers) enrichir(resultats.ateliers, 'atelier')

  return NextResponse.json(resultats)
}
