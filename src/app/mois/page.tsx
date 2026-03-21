import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { moisAujourdhui, moisSuivant, estMoisFutur, formaterMois, dateAujourdhui } from '@/lib/dates'
import type { VisiteAvecRelations } from '@/types/visits'
import { BreadcrumbVues } from '@/components/tableau-journalier/breadcrumb-vues'
import { NavigationMois } from '@/components/tableau-journalier/navigation-mois'
import { TableauMensuelVisites } from '@/components/tableau-journalier/tableau-mensuel-visites'
import { BoutonsImportExportVisites } from '@/components/tableau-journalier/boutons-import-export-visites'
import { GrapheVisites, type DonneeGraphe } from '@/components/tableau-journalier/graphe-visites'

export default async function TableauMensuelPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params  = await searchParams
  const moisISO = params.mois && /^\d{4}-\d{2}$/.test(params.mois)
    ? params.mois
    : moisAujourdhui()

  if (estMoisFutur(moisISO)) redirect('/mois')

  const moisSuivantISO = moisSuivant(moisISO)
  const debutMois      = new Date(`${moisISO}-01T00:00:00.000Z`)
  const debutSuivant   = new Date(`${moisSuivantISO}-01T00:00:00.000Z`)
  const moisNum        = parseInt(moisISO.slice(5, 7))
  const anneeNum       = parseInt(moisISO.slice(0, 4))

  const [visitesRaw, sparkRaw] = await Promise.all([
    prisma.visit.findMany({
      where: { date: { gte: debutMois, lt: debutSuivant }, deletedAt: null },
      include: {
        person:     { select: { id: true, nom: true, prenom: true, genre: true, estInscrit: true, _count: { select: { visites: { where: { deletedAt: null } } } } } },
        saisiePar:  { select: { prenom: true, nom: true } },
        modifiePar: { select: { prenom: true, nom: true } },
        demarches:  true,
        ateliers:   { where: { deletedAt: null }, include: { actionCollective: { select: { themeId: true, themeRef: { select: { nom: true } } } } } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.$queryRaw<{ annee: number; jour: number; nb: bigint }[]>`
      SELECT EXTRACT(YEAR FROM date)::int AS annee,
             EXTRACT(DAY FROM date)::int AS jour,
             COUNT(*) AS nb
      FROM "Visit"
      WHERE EXTRACT(MONTH FROM date) = ${moisNum}
        AND EXTRACT(YEAR FROM date) BETWEEN ${anneeNum - 2} AND ${anneeNum}
        AND "deletedAt" IS NULL
      GROUP BY annee, jour
      ORDER BY annee, jour
    `,
  ])

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

  // Groupement par jour + tri par nom dans chaque groupe
  const groupMap = new Map<string, VisiteAvecRelations[]>()
  for (const visite of visitesRaw) {
    const iso = visite.date.toISOString().slice(0, 10)
    if (!groupMap.has(iso)) groupMap.set(iso, [])
    groupMap.get(iso)!.push(visite)
  }
  const visitesParJour = [...groupMap.entries()].map(([dateISO, visites]) => ({
    dateISO,
    visites: visites.sort((a, b) => {
      const cmp = a.person.nom.toUpperCase().localeCompare(b.person.nom.toUpperCase(), 'fr')
      if (cmp !== 0) return cmp
      return a.person.prenom.toUpperCase().localeCompare(b.person.prenom.toUpperCase(), 'fr')
    }),
  }))

  const [annee] = moisISO.split('-').map(Number)
  const labelMois = formaterMois(moisISO)
  const nbVisites = visitesRaw.length

  // Données sparkbar mensuel
  const nbJoursDansMois = new Date(Date.UTC(anneeNum, moisNum, 0)).getUTCDate()
  const comptesParAnneeJour = new Map<string, number>()
  for (const r of sparkRaw) comptesParAnneeJour.set(`${r.annee}-${r.jour}`, Number(r.nb))
  const aujourdhuiISO = dateAujourdhui()
  const jourCourant   = parseInt(aujourdhuiISO.slice(8, 10))
  const estMoisCourant = moisISO === moisAujourdhui()
  const donneesGrapheMensuel: DonneeGraphe[] = Array.from({ length: nbJoursDansMois }, (_, i) => {
    const j = i + 1
    const valeur = comptesParAnneeJour.get(`${anneeNum}-${j}`) ?? 0
    const n1 = comptesParAnneeJour.get(`${anneeNum - 1}-${j}`) ?? 0
    const n2 = comptesParAnneeJour.get(`${anneeNum - 2}-${j}`) ?? 0
    return { label: String(j), valeur, reference: Math.round((n1 + n2) / 2), actif: estMoisCourant && j === jourCourant }
  })

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <BreadcrumbVues
            vue="mensuelle"
            annee={annee}
            moisISO={moisISO}
            dateISO={dateAujourdhui()}
          />
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-blue-600">Tableau d&apos;Accueil Mensuel</h1>
            <BoutonsImportExportVisites
              annee={annee}
              mois={moisISO}
              themeFiltre={null}
              champFiltre={null}
              recherche={null}
              showImport={false}
            />
          </div>
        </div>
        <NavigationMois moisISO={moisISO} />
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        <strong className="text-foreground">{nbVisites}</strong>{' '}
        visite{nbVisites > 1 ? 's' : ''} en{' '}
        <span className="capitalize">{labelMois}</span>
      </div>

      <GrapheVisites donnees={donneesGrapheMensuel} />

      <TableauMensuelVisites
        visitesParJour={visitesParJour}
        badgesParPersonId={badgesParPersonId}
        moisISO={moisISO}
      />
    </main>
  )
}
