import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { formaterDateCourte } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { peutAcceder } from '@/lib/permissions'
import { BoutonExportAteliers } from '@/components/ateliers/bouton-export-ateliers'
import { TableauAteliers } from '@/components/ateliers/tableau-ateliers'
import type { CategorieAvecThemes } from '@/schemas/atelier'
import type { CategorieAtelierData, GroupeAtelierData, SessionAtelierData } from '@/schemas/atelier'

type AtelierAvecRelations = Awaited<ReturnType<typeof prisma.actionCollective.findMany>>[0] & {
  themeRef: { id: number; nom: string; categorie: { id: number; nom: string; couleur: string; ordre: number } }
  prestataire: { id: number; nom: string } | null
  fichiers: { id: number; nom: string }[]
}

type GroupeAtelier = {
  prestataireNom: string | null
  themeNom: string
  lieu: string | null
  sessions: AtelierAvecRelations[]
}

export default async function AteliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; themeId?: string; participant?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'ateliers')) redirect('/')

  const params = await searchParams
  const q           = params.q?.trim() ?? ''
  const themeIdStr  = params.themeId ?? ''
  const participant = params.participant?.trim() ?? ''
  const themeIdFilter = themeIdStr ? Number(themeIdStr) : null

  const peutModifier = peutAcceder(session, 'ateliers', 'creer_modifier')
  const estTS        = peutModifier
  const peutGerer    = peutModifier

  // Construire le filtre Prisma (AND de tous les critères actifs)
  const conditions: Prisma.ActionCollectiveWhereInput[] = [{ deletedAt: null }]

  if (q.length >= 2) {
    conditions.push({
      OR: [
        { themeRef: { nom: { contains: q, mode: 'insensitive' } } },
        { lieu: { contains: q, mode: 'insensitive' } },
        { prestataire: { nom: { contains: q, mode: 'insensitive' } } },
        { themeRef: { categorie: { nom: { contains: q, mode: 'insensitive' } } } },
      ],
    })
  }

  if (themeIdFilter) {
    conditions.push({ themeId: themeIdFilter })
  }

  if (participant.length >= 2) {
    conditions.push({
      participants: {
        some: {
          deletedAt: null,
          person: {
            OR: [
              { nom: { contains: participant, mode: 'insensitive' } },
              { prenom: { contains: participant, mode: 'insensitive' } },
            ],
          },
        },
      },
    })
  }

  const where: Prisma.ActionCollectiveWhereInput = conditions.length === 1
    ? conditions[0]
    : { AND: conditions }

  const ateliers = await prisma.actionCollective.findMany({
    where,
    include: {
      themeRef: { include: { categorie: true } },
      prestataire: true,
      fichiers: {
        select:  { id: true, nom: true },
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { date: 'asc' },
  }) as AtelierAvecRelations[]

  // Comptage des participants depuis ParticipationAtelier (source de vérité unique)
  const compteurRows = ateliers.length > 0
    ? await prisma.participationAtelier.groupBy({
        by: ['actionCollectiveId'],
        where: {
          actionCollectiveId: { in: ateliers.map((a) => a.id) },
          deletedAt: null,
        },
        _count: { id: true },
      })
    : []
  const compteurParAtelier = new Map(
    compteurRows.map((r) => [r.actionCollectiveId, r._count.id])
  )

  // Charger toutes les catégories (même celles sans ateliers, pour la gestion)
  const toutesCategories = await prisma.categorieAtelier.findMany({
    where: { deletedAt: null },
    include: {
      themes: {
        where: { deletedAt: null },
        orderBy: { ordre: 'asc' },
        select: { id: true, nom: true, ordre: true },
      },
    },
    orderBy: { ordre: 'asc' },
  }) as CategorieAvecThemes[]

  // Groupement : catégorie → (prestataire + thème + lieu) → sessions[]
  const groupesParCategorie = new Map<number, { categorie: CategorieAvecThemes; groupes: GroupeAtelier[] }>()

  for (const a of ateliers) {
    const catId = a.themeRef.categorie.id
    if (!groupesParCategorie.has(catId)) {
      const cat = toutesCategories.find((c) => c.id === catId)
      if (!cat) continue
      groupesParCategorie.set(catId, { categorie: cat, groupes: [] })
    }
    const entry = groupesParCategorie.get(catId)!
    let groupe = entry.groupes.find(
      (g) => g.prestataireNom === (a.prestataire?.nom ?? null) && g.themeNom === a.themeRef.nom && g.lieu === (a.lieu ?? null)
    )
    if (!groupe) {
      groupe = { prestataireNom: a.prestataire?.nom ?? null, themeNom: a.themeRef.nom, lieu: a.lieu ?? null, sessions: [] }
      entry.groupes.push(groupe)
    }
    groupe.sessions.push(a)
  }

  // Ordonner les catégories selon leur ordre
  const categoriesOrdonnees = toutesCategories
    .filter((c) => groupesParCategorie.has(c.id))
    .sort((a, b) => a.ordre - b.ordre)

  // Sérialiser pour le composant client
  const categoriesData: CategorieAtelierData[] = categoriesOrdonnees.map((cat) => {
    const entry = groupesParCategorie.get(cat.id)!
    const groupes: GroupeAtelierData[] = entry.groupes.map((g) => ({
      prestataireNom: g.prestataireNom,
      themeNom: g.themeNom,
      lieu: g.lieu,
      sessions: g.sessions.map((a): SessionAtelierData => ({
        id: a.id,
        date: formaterDateCourte(a.date),
        themeAutre: a.themeAutre,
        themeId: a.themeId,
        prestataireId: a.prestataireId,
        fichiers: a.fichiers,
        nbParticipants: compteurParAtelier.get(a.id) ?? 0,
      })),
    }))
    return {
      id: cat.id,
      nom: cat.nom,
      couleur: cat.couleur,
      ordre: cat.ordre,
      themes: cat.themes,
      groupes,
    }
  })

  const total = ateliers.length
  const hasFilters = q || themeIdFilter || participant

  // Nom du thème sélectionné (pour l'affichage)
  const themeSelectionne = themeIdFilter
    ? toutesCategories.flatMap((c) => c.themes).find((t) => t.id === themeIdFilter)?.nom ?? null
    : null

  return (
    <main className="container mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Actions collectives</h1>
            <BoutonExportAteliers />
            {peutAcceder(session, 'ateliers', 'importer') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/import/ateliers">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Download className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Importer Excel</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{total} atelier{total > 1 ? 's' : ''}{hasFilters ? ' (filtré)' : ' au total'}</p>
        </div>
        <div className="flex items-center gap-2">
          {peutModifier && (
            <Link href="/ateliers/nouveau">
              <Button>+ Nouvelle action collective</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filtres */}
      <form method="GET" className="mb-6 space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted-foreground">Recherche libre</label>
            <Input id="q" name="q" defaultValue={q} placeholder="Thème, lieu, prestataire…" />
          </div>
          <div className="min-w-[200px] max-w-xs">
            <label htmlFor="themeId" className="mb-1 block text-xs font-medium text-muted-foreground">Thème</label>
            <select
              id="themeId"
              name="themeId"
              defaultValue={themeIdStr}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Tous les thèmes</option>
              {toutesCategories.map((cat) => (
                <optgroup key={cat.id} label={cat.nom}>
                  {cat.themes.map((t) => (
                    <option key={t.id} value={t.id}>{t.nom}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] max-w-xs">
            <label htmlFor="participant" className="mb-1 block text-xs font-medium text-muted-foreground">Participant</label>
            <Input id="participant" name="participant" defaultValue={participant} placeholder="Nom ou prénom…" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="outline">Filtrer</Button>
            {hasFilters && (
              <Link href="/ateliers">
                <Button type="button" variant="ghost">Réinitialiser</Button>
              </Link>
            )}
          </div>
        </div>
        {/* Tags de filtre actif */}
        {hasFilters && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {q && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5">
                Recherche : « {q} »
              </span>
            )}
            {themeSelectionne && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5">
                Thème : {themeSelectionne}
              </span>
            )}
            {participant && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5">
                Participant : « {participant} »
              </span>
            )}
          </div>
        )}
      </form>

      {/* Tableau groupé par catégorie */}
      {ateliers.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {hasFilters ? 'Aucun atelier ne correspond à vos critères.' : 'Aucun atelier enregistré.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-center">Participants</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <TableauAteliers
              categories={categoriesData}
              estTS={estTS}
              peutGerer={peutGerer}
              participantFilter={participant || undefined}
            />
          </table>
        </div>
      )}
    </main>
  )
}
