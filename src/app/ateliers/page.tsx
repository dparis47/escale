import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { formaterDateCourte } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BoutonSupprimerAtelier } from '@/components/ateliers/bouton-supprimer-atelier'
import { BoutonEmargementTheme } from '@/components/ateliers/bouton-emargement-theme'
import { THEMES_ATELIER_FR, COULEURS_THEME } from '@/schemas/atelier'
import type { ThemeAtelier } from '@prisma/client'

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

  // Charger les fichiers d'émargement groupés par thème
  const fichiersExistants = await prisma.fichierEmargement.findMany({
    select:  { id: true, theme: true, nom: true },
    orderBy: { createdAt: 'asc' },
  })
  const fichiersParTheme = new Map<ThemeAtelier, { id: number; nom: string }[]>()
  for (const f of fichiersExistants) {
    const t = f.theme as ThemeAtelier
    if (!fichiersParTheme.has(t)) fichiersParTheme.set(t, [])
    fichiersParTheme.get(t)!.push({ id: f.id, nom: f.nom })
  }

  // Recherche sur les thèmes dont le label contient q, ou sur lieu/prestataire
  const themesMatchants = q.length >= 2
    ? (Object.entries(THEMES_ATELIER_FR) as [ThemeAtelier, string][])
        .filter(([, label]) => label.toLowerCase().includes(q.toLowerCase()))
        .map(([theme]) => theme)
    : []

  const where = q.length >= 2
    ? {
        deletedAt: null,
        OR: [
          ...(themesMatchants.length > 0 ? [{ theme: { in: themesMatchants } }] : []),
          { lieu:        { contains: q, mode: 'insensitive' as const } },
          { prestataire: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : { deletedAt: null }

  const ateliers = await prisma.actionCollective.findMany({
    where,
    orderBy: { date: 'asc' },
  })

  // Comptage réel depuis le tableau journalier (source de vérité, sans dépendre de l'import)
  // - personnes avec fiche  : COUNT(DISTINCT personId)
  // - personnes sans fiche  : COUNT(DISTINCT nom|prenom)
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

  // Grouper par thème, trié alphabétiquement sur le label français
  const groupes = new Map<ThemeAtelier, typeof ateliers>()
  for (const a of ateliers) {
    const t = a.theme as ThemeAtelier
    if (!groupes.has(t)) groupes.set(t, [])
    groupes.get(t)!.push(a)
  }
  // Trier les thèmes par label français
  const themesOrdonnes = [...groupes.keys()].sort((a, b) =>
    THEMES_ATELIER_FR[a].localeCompare(THEMES_ATELIER_FR[b], 'fr')
  )

  const total = ateliers.length

  return (
    <main className="container mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Actions collectives</h1>
          <p className="text-sm text-muted-foreground">{total} atelier{total > 1 ? 's' : ''} au total</p>
        </div>
        {estTS && (
          <Link href="/ateliers/nouveau">
            <Button>+ Nouvel atelier</Button>
          </Link>
        )}
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

      {/* Tableau groupé par thème */}
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
                <th className="px-3 py-2 text-left">Émargement</th>
              </tr>
            </thead>
            <tbody>
              {themesOrdonnes.map((theme) => {
                const lignes      = groupes.get(theme)!
                const lieu        = lignes[0]?.lieu        ?? null
                const prestataire = lignes[0]?.prestataire ?? null
                const c           = COULEURS_THEME[theme]
                return (
                <>
                  {/* Ligne de section thème + lieu + prestataire */}
                  <tr key={`theme-${theme}`} className={c.bg}>
                    <td colSpan={3} className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${c.text}`}>
                      {THEMES_ATELIER_FR[theme]}
                      {lieu && (
                        <span className={`ml-2 font-normal normal-case ${c.sub}`}>— {lieu}</span>
                      )}
                      {prestataire && (
                        <span className={`ml-2 font-normal normal-case ${c.sub}`}>({prestataire})</span>
                      )}
                      <span className={`ml-2 font-normal normal-case ${c.sub}`}>
                        · {lignes.length} séance{lignes.length > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className={`px-3 py-1.5 ${c.bg}`}>
                      <BoutonEmargementTheme
                        theme={theme}
                        label={THEMES_ATELIER_FR[theme]}
                        fichiers={fichiersParTheme.get(theme) ?? []}
                        peutGerer={peutGerer}
                      />
                    </td>
                  </tr>
                  {/* Lignes ateliers */}
                  {lignes.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">
                        {formaterDateCourte(a.date)}
                        {a.themeAutre && (
                          <span className="ml-2 font-medium text-foreground">{a.themeAutre}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {compteurParAtelier.get(a.id) ?? 0}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Link href={`/ateliers/${a.id}`}>
                            <Button variant="outline" size="sm">Voir</Button>
                          </Link>
                          {estTS && (
                            <Link href={`/ateliers/${a.id}/modifier`}>
                              <Button variant="outline" size="sm">Modifier</Button>
                            </Link>
                          )}
                          <BoutonSupprimerAtelier id={a.id} />
                        </div>
                      </td>
                      <td />
                    </tr>
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
