import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { formaterDateCourte } from '@/lib/dates'
import { Eye, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { BoutonSupprimerAtelier } from '@/components/ateliers/bouton-supprimer-atelier'
import { BoutonExportAteliers } from '@/components/ateliers/bouton-export-ateliers'
import { BoutonEmargementSeance } from '@/components/ateliers/bouton-emargement-seance'
import { DialogueCreerCategorie, DialogueModifierCategorie } from '@/components/ateliers/dialogue-categorie'
import { COULEURS_CATEGORIE } from '@/schemas/atelier'
import type { CategorieAvecThemes } from '@/schemas/atelier'

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
  searchParams: Promise<{ q?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'ACCUEIL') redirect('/')

  const params = await searchParams
  const q      = params.q?.trim() ?? ''

  const estTS     = session.user.role === 'TRAVAILLEUR_SOCIAL'
  const peutGerer = estTS

  const where = q.length >= 2
    ? {
        deletedAt: null,
        OR: [
          { themeRef: { nom: { contains: q, mode: 'insensitive' as const } } },
          { lieu: { contains: q, mode: 'insensitive' as const } },
          { prestataire: { nom: { contains: q, mode: 'insensitive' as const } } },
          { themeRef: { categorie: { nom: { contains: q, mode: 'insensitive' as const } } } },
        ],
      }
    : { deletedAt: null }

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

  // Comptage réel depuis le tableau journalier
  type CompteurRow = { id: bigint; total: bigint }
  const compteurRows = ateliers.length > 0
    ? await prisma.$queryRaw<CompteurRow[]>(Prisma.sql`
        SELECT
          ac.id,
          COUNT(DISTINCT v."personId") FILTER (WHERE d."atelierParticipation" = true) AS total
        FROM "ActionCollective" ac
        LEFT JOIN "Visit" v
          ON  v.date        = ac.date
          AND v."deletedAt" IS NULL
        LEFT JOIN "Demarches" d ON d."visitId" = v.id
        WHERE ac.id         IN (${Prisma.join(ateliers.map((a) => a.id))})
          AND ac."deletedAt" IS NULL
        GROUP BY ac.id
      `)
    : []
  const compteurParAtelier = new Map(compteurRows.map((r) => [Number(r.id), Number(r.total)]))

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
    const cle = `${a.prestataire?.nom ?? ''}|${a.themeRef.nom}|${a.lieu ?? ''}`
    let groupe = entry.groupes.find(
      (g) => g.prestataireNom === (a.prestataire?.nom ?? null) && g.themeNom === a.themeRef.nom && g.lieu === (a.lieu ?? null)
    )
    if (!groupe) {
      groupe = { prestataireNom: a.prestataire?.nom ?? null, themeNom: a.themeRef.nom, lieu: a.lieu ?? null, sessions: [] }
      entry.groupes.push(groupe)
    }
    void cle
    groupe.sessions.push(a)
  }

  // Ordonner les catégories selon leur ordre
  const categoriesOrdonnees = toutesCategories
    .filter((c) => groupesParCategorie.has(c.id))
    .sort((a, b) => a.ordre - b.ordre)

  const total = ateliers.length

  return (
    <main className="container mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Actions collectives</h1>
            <BoutonExportAteliers />
          </div>
          <p className="text-sm text-muted-foreground">{total} atelier{total > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-2">
          {estTS && (
            <Link href="/ateliers/nouveau">
              <Button>+ Nouvel atelier</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Recherche */}
      <form method="GET" className="mb-6">
        <div className="flex max-w-sm gap-2">
          <Input name="q" defaultValue={q} placeholder="Thème, lieu, prestataire…" />
          <Button type="submit" variant="outline">Rechercher</Button>
          {q && (
            <Link href="/ateliers">
              <Button variant="ghost">✕</Button>
            </Link>
          )}
        </div>
      </form>

      {/* Tableau groupé par catégorie */}
      {ateliers.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {q ? 'Aucun atelier ne correspond à votre recherche.' : 'Aucun atelier enregistré.'}
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
            <tbody>
              {categoriesOrdonnees.map((cat) => {
                const entry = groupesParCategorie.get(cat.id)!
                const couleur = COULEURS_CATEGORIE[cat.couleur] ?? COULEURS_CATEGORIE.gray
                return (
                  <>
                    {/* En-tête catégorie */}
                    <tr key={`cat-${cat.id}`}>
                      <td colSpan={3} className="border-t-2 border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold uppercase tracking-wide text-slate-700">
                        <span className="flex items-center justify-between">
                          <span>{cat.nom}</span>
                          {estTS && (
                            <span className="flex items-center gap-0.5">
                              <DialogueModifierCategorie categorie={cat} />
                              <DialogueCreerCategorie apresOrdre={cat.ordre} />
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                    {/* Groupes (prestataire + thème + lieu) dans cette catégorie */}
                    {entry.groupes.map((groupe, gi) => (
                      <>
                        {/* Ligne de section atelier */}
                        <tr key={`groupe-${cat.id}-${gi}`} className={couleur.bg}>
                          <td colSpan={3} className={`px-3 py-1.5 pl-6 text-xs font-semibold tracking-wide ${couleur.text}`}>
                            <span className="uppercase">{groupe.themeNom}</span>
                            {groupe.prestataireNom && (
                              <span className="ml-2 normal-case">{groupe.prestataireNom}</span>
                            )}
                            {groupe.lieu && (
                              <span className={`ml-2 font-normal normal-case ${couleur.sub}`}>— {groupe.lieu}</span>
                            )}
                            <span className={`ml-2 font-normal normal-case ${couleur.sub}`}>
                              · {groupe.sessions.length} séance{groupe.sessions.length > 1 ? 's' : ''}
                            </span>
                          </td>
                        </tr>
                        {/* Lignes séances */}
                        {groupe.sessions.map((a) => (
                          <tr key={a.id} className="border-t hover:bg-muted/30">
                            <td className="px-3 py-2 pl-6 text-muted-foreground">
                              {formaterDateCourte(a.date)}
                              {a.themeAutre && (
                                <span className="ml-2 font-medium text-foreground">{a.themeAutre}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {compteurParAtelier.get(a.id) ?? 0}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-0.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link href={`/ateliers/${a.id}`}>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-600">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent>Voir</TooltipContent>
                                </Tooltip>
                                {estTS && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Link href={`/ateliers/${a.id}/modifier`}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-600">
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>Modifier</TooltipContent>
                                  </Tooltip>
                                )}
                                <BoutonEmargementSeance
                                  atelierId={a.id}
                                  fichiers={a.fichiers}
                                  peutGerer={peutGerer}
                                />
                                <BoutonSupprimerAtelier id={a.id} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
