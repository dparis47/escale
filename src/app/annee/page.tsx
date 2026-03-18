import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { moisAujourdhui, dateAujourdhui } from '@/lib/dates'
import { BreadcrumbVues } from '@/components/tableau-journalier/breadcrumb-vues'
import { NavigationAnnee } from '@/components/tableau-journalier/navigation-annee'
import { FiltresAnnee } from '@/components/tableau-journalier/filtres-annee'
import { BoutonsImportExportVisites } from '@/components/tableau-journalier/boutons-import-export-visites'
import { champsTheme, ARBRE_DEMARCHES, feuillesTheme } from '@/lib/demarches'
import { capitaliserPrenom } from '@/lib/dates'
import { peutAcceder } from '@/lib/permissions'

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export default async function VueAnnuellePage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; theme?: string; demarche?: string; q?: string; nbVisitesMin?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params        = await searchParams
  const anneeActuelle = new Date().getUTCFullYear()
  const annee = params.annee && /^\d{4}$/.test(params.annee)
    ? parseInt(params.annee)
    : anneeActuelle

  // Validation des filtres
  const themeFiltre = params.theme && ARBRE_DEMARCHES.some((t) => t.id === params.theme)
    ? params.theme
    : null
  const champFiltre = params.demarche && themeFiltre
    && champsTheme(themeFiltre).includes(params.demarche)
    ? params.demarche
    : null
  const recherche = params.q && params.q.trim().length >= 2 ? params.q.trim() : null
  const nbVisitesMin = params.nbVisitesMin && /^\d+$/.test(params.nbVisitesMin)
    ? Math.max(1, parseInt(params.nbVisitesMin))
    : null

  const debutAnnee    = new Date(`${annee}-01-01T00:00:00.000Z`)
  const debutSuivante = new Date(`${annee + 1}-01-01T00:00:00.000Z`)

  // Construction dynamique de la requête SQL
  const hasDemarcheFilter = champFiltre || themeFiltre
  const hasPersonFilter   = recherche !== null

  // Toujours construire via $queryRawUnsafe pour pouvoir composer dynamiquement
  const sqlParts: string[] = []
  const sqlParams: unknown[] = []
  let paramIndex = 1

  // SELECT + FROM
  sqlParts.push(`SELECT EXTRACT(MONTH FROM v.date)::int AS mois, COUNT(*) AS nb FROM "Visit" v`)

  // JOINs conditionnels
  if (hasDemarcheFilter) {
    sqlParts.push(`JOIN "Demarches" d ON d."visitId" = v.id`)
  }
  if (hasPersonFilter) {
    sqlParts.push(`JOIN "Person" p ON p.id = v."personId"`)
  }

  // WHERE de base
  sqlParts.push(`WHERE v.date >= $${paramIndex} AND v.date < $${paramIndex + 1} AND v."deletedAt" IS NULL`)
  sqlParams.push(debutAnnee, debutSuivante)
  paramIndex += 2

  // Filtre démarche
  if (champFiltre) {
    sqlParts.push(`AND d."${champFiltre}" = true`)
  } else if (themeFiltre) {
    const champs = champsTheme(themeFiltre)
    const orClause = champs.map((c) => `d."${c}" = true`).join(' OR ')
    sqlParts.push(`AND (${orClause})`)
  }

  // Filtre personne
  if (hasPersonFilter) {
    const pattern = `%${recherche}%`
    sqlParts.push(`AND (p."nom" ILIKE $${paramIndex} OR p."prenom" ILIKE $${paramIndex})`)
    sqlParams.push(pattern)
    paramIndex += 1
  }

  // Filtre par nombre minimum de visites (toutes dates confondues)
  if (nbVisitesMin !== null) {
    sqlParts.push(`AND v."personId" IN (SELECT "personId" FROM "Visit" WHERE "deletedAt" IS NULL GROUP BY "personId" HAVING COUNT(*) >= $${paramIndex})`)
    sqlParams.push(nbVisitesMin)
    paramIndex += 1
  }

  sqlParts.push(`GROUP BY mois ORDER BY mois`)

  const parMoisRaw = await prisma.$queryRawUnsafe<{ mois: number; nb: bigint }[]>(
    sqlParts.join(' '),
    ...sqlParams,
  )

  const nbParMois = new Map(parMoisRaw.map((r) => [r.mois, Number(r.nb)]))
  const totalAnnee = [...nbParMois.values()].reduce((s, n) => s + n, 0)
  const moisCourantISO = moisAujourdhui()

  // Détail démarches par thème par mois
  const themeColumns = ARBRE_DEMARCHES.map((theme) => {
    const champs = champsTheme(theme.id)
    const orClause = champs.map((c) => `d."${c}" = true`).join(' OR ')
    return `COALESCE(SUM(CASE WHEN (${orClause}) THEN 1 ELSE 0 END), 0) AS "${theme.id}"`
  }).join(', ')

  const tParts: string[] = []
  const tParams: unknown[] = []
  let tIdx = 1

  tParts.push(`SELECT EXTRACT(MONTH FROM v.date)::int AS mois, ${themeColumns} FROM "Visit" v`)
  tParts.push(`LEFT JOIN "Demarches" d ON d."visitId" = v.id`)
  if (hasPersonFilter) {
    tParts.push(`JOIN "Person" p ON p.id = v."personId"`)
  }
  tParts.push(`WHERE v.date >= $${tIdx} AND v.date < $${tIdx + 1} AND v."deletedAt" IS NULL`)
  tParams.push(debutAnnee, debutSuivante)
  tIdx += 2

  if (champFiltre) {
    tParts.push(`AND d."${champFiltre}" = true`)
  } else if (themeFiltre) {
    const c = champsTheme(themeFiltre)
    tParts.push(`AND (${c.map((ch) => `d."${ch}" = true`).join(' OR ')})`)
  }
  if (hasPersonFilter) {
    tParts.push(`AND (p."nom" ILIKE $${tIdx} OR p."prenom" ILIKE $${tIdx})`)
    tParams.push(`%${recherche}%`)
    tIdx += 1
  }
  if (nbVisitesMin !== null) {
    tParts.push(`AND v."personId" IN (SELECT "personId" FROM "Visit" WHERE "deletedAt" IS NULL GROUP BY "personId" HAVING COUNT(*) >= $${tIdx})`)
    tParams.push(nbVisitesMin)
    tIdx += 1
  }
  tParts.push(`GROUP BY mois ORDER BY mois`)

  const themeRaw = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    tParts.join(' '),
    ...tParams,
  )

  const themeParMois = new Map<number, { id: string; label: string; count: number }[]>()
  for (const row of themeRaw) {
    const mois = row.mois as number
    const themes = ARBRE_DEMARCHES
      .map((t) => ({ id: t.id, label: t.label, count: Number(row[t.id] ?? 0) }))
      .filter((t) => t.count > 0)
    if (themes.length > 0) {
      themeParMois.set(mois, themes)
    }
  }

  // Totaux annuels par thème
  const totauxThemes = ARBRE_DEMARCHES
    .map((t) => {
      const total = [...themeParMois.values()].reduce(
        (sum, themes) => sum + (themes.find((th) => th.id === t.id)?.count ?? 0),
        0,
      )
      return { id: t.id, label: t.label, count: total }
    })
    .filter((t) => t.count > 0)

  // Quand une recherche personne est active, charger les personnes correspondantes
  let personnesTrouvees: { id: number; nom: string; prenom: string; nbVisites: number }[] = []
  if (hasPersonFilter) {
    const personnesRaw = await prisma.$queryRawUnsafe<
      { id: number; nom: string; prenom: string; nb: bigint }[]
    >(
      `SELECT p.id, p."nom", p."prenom", COUNT(v.id) AS nb
       FROM "Person" p
       JOIN "Visit" v ON v."personId" = p.id
       ${hasDemarcheFilter ? 'JOIN "Demarches" d ON d."visitId" = v.id' : ''}
       WHERE v.date >= $1 AND v.date < $2
         AND v."deletedAt" IS NULL
         AND (p."nom" ILIKE $3 OR p."prenom" ILIKE $3)
         ${champFiltre ? `AND d."${champFiltre}" = true` : ''}
         ${!champFiltre && themeFiltre ? `AND (${champsTheme(themeFiltre).map((c) => `d."${c}" = true`).join(' OR ')})` : ''}
       ${nbVisitesMin !== null ? `AND v."personId" IN (SELECT "personId" FROM "Visit" WHERE "deletedAt" IS NULL GROUP BY "personId" HAVING COUNT(*) >= ${nbVisitesMin})` : ''}
       GROUP BY p.id, p."nom", p."prenom"
       ORDER BY p."nom", p."prenom"`,
      debutAnnee,
      debutSuivante,
      `%${recherche}%`,
    )
    personnesTrouvees = personnesRaw.map((r) => ({
      id: r.id,
      nom: r.nom,
      prenom: r.prenom,
      nbVisites: Number(r.nb),
    }))
  }

  // Label du filtre actif
  const labelParts: string[] = []
  if (recherche) labelParts.push(`« ${recherche} »`)
  if (nbVisitesMin !== null) labelParts.push(`≥ ${nbVisitesMin} visite${nbVisitesMin > 1 ? 's' : ''}`)
  if (champFiltre && themeFiltre) {
    const feuille = feuillesTheme(themeFiltre).find((f) => f.champ === champFiltre)
    labelParts.push(feuille?.label ?? '')
  } else if (themeFiltre) {
    labelParts.push(ARBRE_DEMARCHES.find((t) => t.id === themeFiltre)?.label ?? '')
  }
  const labelFiltre = labelParts.length > 0 ? `— ${labelParts.join(' · ')}` : null

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <BreadcrumbVues
            vue="annuelle"
            annee={annee}
            moisISO={moisCourantISO}
            dateISO={dateAujourdhui()}
          />
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-blue-600">Vue annuelle</h1>
            <BoutonsImportExportVisites
              annee={annee}
              themeFiltre={themeFiltre}
              champFiltre={champFiltre}
              recherche={recherche}
              showImport={peutAcceder(session, 'tableau_journalier', 'importer')}
            />
          </div>
        </div>
        <NavigationAnnee annee={annee} basePath="/annee" />
      </div>

      <FiltresAnnee
        annee={annee}
        themeFiltre={themeFiltre}
        champFiltre={champFiltre}
        recherche={recherche}
        nbVisitesMin={nbVisitesMin}
      />

      {labelFiltre && (
        <p className="mb-3 text-sm text-muted-foreground">
          <strong className="text-foreground">{totalAnnee}</strong> visite{totalAnnee > 1 ? 's' : ''} en {annee} {labelFiltre}
        </p>
      )}

      <div className="max-w-xl rounded-md border border-gray-300 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Mois</th>
              <th className="px-4 py-2 text-right">Visites</th>
            </tr>
          </thead>
          <tbody>
            {MOIS_FR.map((nomMois, i) => {
              const numMois  = i + 1
              const moisISO  = `${annee}-${String(numMois).padStart(2, '0')}`
              const nb       = nbParMois.get(numMois) ?? 0
              const estFutur = moisISO > moisCourantISO
              const estCourant = moisISO === moisCourantISO
              const themes = themeParMois.get(numMois)

              return (
                <tr
                  key={numMois}
                  className={`border-t border-gray-200 ${estCourant ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-2">
                    {estFutur ? (
                      <span className="text-muted-foreground">{nomMois}</span>
                    ) : (
                      <div>
                        <Link
                          href={`/mois?mois=${moisISO}`}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {nomMois}
                        </Link>
                        {themes && themes.length > 0 && (
                          <details className="mt-1 [&>summary]:list-none [&>summary::-webkit-details-marker]:hidden">
                            <summary className="cursor-pointer inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                              <span className="transition-transform [[open]>&]:rotate-90">&#9656;</span>
                              Démarches
                            </summary>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {themes.map((t) => (
                                <span
                                  key={t.id}
                                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                  {t.label} <strong className="text-foreground">{t.count}</strong>
                                </span>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right align-top">
                    {estFutur ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <strong className="tabular-nums">{nb}</strong>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-muted/30 font-semibold">
              <td className="px-4 py-2">Total {annee}</td>
              <td className="px-4 py-2 text-right tabular-nums">{totalAnnee}</td>
            </tr>
            {totauxThemes.length > 0 && (
              <tr className="bg-muted/30">
                <td colSpan={2} className="px-4 pb-2 pt-1">
                  <details className="[&>summary]:list-none [&>summary::-webkit-details-marker]:hidden">
                    <summary className="cursor-pointer inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                      <span className="transition-transform [[open]>&]:rotate-90">&#9656;</span>
                      Démarches
                    </summary>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {totauxThemes.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {t.label} <strong className="text-foreground">{t.count}</strong>
                        </span>
                      ))}
                    </div>
                  </details>
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Personnes trouvées par la recherche */}
      {personnesTrouvees.length > 0 && (
        <div className="mt-6 max-w-lg">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Personnes correspondantes ({personnesTrouvees.length})
          </h2>
          <div className="rounded-md border border-gray-300 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Nom / Prénom</th>
                  <th className="px-4 py-2 text-right">Visites</th>
                </tr>
              </thead>
              <tbody>
                {personnesTrouvees.map((p) => (
                  <tr key={p.id} className="border-t border-gray-200">
                    <td className="px-4 py-2">
                      <Link
                        href={`/personnes/${p.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {p.nom.toUpperCase()} {capitaliserPrenom(p.prenom)}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <strong className="tabular-nums">{p.nbVisites}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
