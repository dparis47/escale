import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO, dateAujourdhui, estFutur } from '@/lib/dates'
import { BreadcrumbVues } from '@/components/tableau-journalier/breadcrumb-vues'
import { NavigationDate } from '@/components/tableau-journalier/navigation-date'
import { TableauVisites } from '@/components/tableau-journalier/tableau-visites'
import { FormulaireVisite } from '@/components/tableau-journalier/formulaire-visite'
import { GrapheVisites, type DonneeGraphe } from '@/components/tableau-journalier/graphe-visites'

export default async function TableauJournalierPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams
  const dateISO =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : dateAujourdhui()

  if (estFutur(dateISO)) redirect('/')

  const annee = parseInt(dateISO.slice(0, 4))
  const mois  = parseInt(dateISO.slice(5, 7))

  const debutMois       = new Date(`${annee}-${String(mois).padStart(2, '0')}-01T00:00:00.000Z`)
  const debutMoisSuivant = mois === 12
    ? new Date(`${annee + 1}-01-01T00:00:00.000Z`)
    : new Date(`${annee}-${String(mois + 1).padStart(2, '0')}-01T00:00:00.000Z`)
  const debutAnnee      = new Date(`${annee}-01-01T00:00:00.000Z`)
  const debutAnneeSuivante = new Date(`${annee + 1}-01-01T00:00:00.000Z`)
  const debutAnneeN2    = new Date(`${annee - 2}-01-01T00:00:00.000Z`)

  const [visitesRaw, nbVisitesMois, nbVisitesAnnee, countsPartenairesRaw, sparkRaw] = await Promise.all([
    prisma.visit.findMany({
      where: { date: parseISO(dateISO), deletedAt: null },
      include: {
        person:      { select: { id: true, nom: true, prenom: true, genre: true, estInscrit: true, _count: { select: { visites: { where: { deletedAt: null } } } } } },
        saisiePar:   { select: { prenom: true, nom: true } },
        modifiePar:  { select: { prenom: true, nom: true } },
        demarches: {
          include: {
            actionCollective: { select: { themeId: true, themeRef: { select: { nom: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // trié ensuite en JS
    }),
    prisma.visit.count({
      where: { deletedAt: null, date: { gte: debutMois, lt: debutMoisSuivant } },
    }),
    prisma.visit.count({
      where: { deletedAt: null, date: { gte: debutAnnee, lt: debutAnneeSuivante } },
    }),
    prisma.$queryRaw<{ partenaire: string; count: bigint }[]>`
      SELECT unnest("partenaires") AS partenaire, COUNT(*) AS count
      FROM "Visit"
      WHERE date = ${parseISO(dateISO)} AND "deletedAt" IS NULL
      GROUP BY partenaire
      ORDER BY partenaire
    `,
    prisma.$queryRaw<{ annee: number; mois: number; nb: bigint }[]>`
      SELECT EXTRACT(YEAR FROM date)::int AS annee,
             EXTRACT(MONTH FROM date)::int AS mois,
             COUNT(*) AS nb
      FROM "Visit"
      WHERE date >= ${debutAnneeN2} AND date < ${debutAnneeSuivante}
        AND "deletedAt" IS NULL
      GROUP BY annee, mois
      ORDER BY annee, mois
    `,
  ])

  const countsPartenaires = countsPartenairesRaw.map((r) => ({
    partenaire: r.partenaire,
    count:      Number(r.count),
  }))

  // Badges accompagnements par personne
  const personIds = [...new Set(visitesRaw.map((v) => v.personId))]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accompagnementsPersonnes = personIds.length > 0 ? await (prisma.accompagnement.findMany as any)({
    where:  { personId: { in: personIds }, deletedAt: null },
    select: { personId: true, suiviASID: { select: { id: true } }, suiviEI: { select: { id: true } } },
  }) as { personId: number; suiviASID: { id: number } | null; suiviEI: { id: number } | null }[] : []

  const badgesParPersonId: Record<number, { fse: boolean; asid: boolean }> = {}
  for (const a of accompagnementsPersonnes) {
    const prev = badgesParPersonId[a.personId] ?? { fse: false, asid: false }
    badgesParPersonId[a.personId] = {
      fse:  prev.fse  || a.suiviEI === null || a.suiviEI === undefined,
      asid: prev.asid || !!a.suiviASID,
    }
  }

  const visites = visitesRaw.sort((a, b) => {
    const nomA = (a.person.nom).toUpperCase()
    const nomB = (b.person.nom).toUpperCase()
    const cmp = nomA.localeCompare(nomB, 'fr')
    if (cmp !== 0) return cmp
    return (a.person.prenom).toUpperCase().localeCompare((b.person.prenom).toUpperCase(), 'fr')
  })

  // Données sparkbar annuel
  const LABELS_MOIS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const comptesParAnneeMois = new Map<string, number>()
  for (const r of sparkRaw) comptesParAnneeMois.set(`${r.annee}-${r.mois}`, Number(r.nb))
  const donneesGrapheAnnuel: DonneeGraphe[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const valeur = comptesParAnneeMois.get(`${annee}-${m}`) ?? 0
    const n1 = comptesParAnneeMois.get(`${annee - 1}-${m}`) ?? 0
    const n2 = comptesParAnneeMois.get(`${annee - 2}-${m}`) ?? 0
    return { label: LABELS_MOIS[i], valeur, reference: Math.round((n1 + n2) / 2), actif: m === mois }
  })

  const labelMois = new Date(dateISO + 'T00:00:00.000Z').toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <BreadcrumbVues
            vue="journaliere"
            annee={annee}
            moisISO={dateISO.slice(0, 7)}
            dateISO={dateISO}
          />
          <h1 className="mt-1 text-2xl font-bold text-blue-600">Tableau d'Accueil Journalier</h1>
        </div>
        <NavigationDate dateISO={dateISO} />
      </div>

      {/* Indicateurs */}
      <div className="mb-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{nbVisitesMois}</strong>{' '}
          visite{nbVisitesMois > 1 ? 's' : ''} en{' '}
          <span className="capitalize">{labelMois}</span>
        </span>
        <span>
          <strong className="text-foreground">{nbVisitesAnnee}</strong>{' '}
          visite{nbVisitesAnnee > 1 ? 's' : ''} en {annee}
        </span>
        {countsPartenaires.length > 0 && (
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Partenaires :</span>
            {countsPartenaires.map(({ partenaire, count }) => (
              <span key={partenaire} className="inline-flex items-center gap-1">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 border border-violet-200">
                  {partenaire}
                </span>
                <strong className="text-foreground text-xs">{count}</strong>
              </span>
            ))}
          </span>
        )}
      </div>

      <GrapheVisites donnees={donneesGrapheAnnuel} />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {visites.length} visite{visites.length > 1 ? 's' : ''} ce jour
        </p>
        <FormulaireVisite dateISO={dateISO} mode="creation" />
      </div>

      <TableauVisites
        visites={visites}
        dateISO={dateISO}
        badgesParPersonId={badgesParPersonId}
      />
    </main>
  )
}
