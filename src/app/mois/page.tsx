import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { moisAujourdhui, moisSuivant, estMoisFutur, formaterMois, dateAujourdhui } from '@/lib/dates'
import type { VisiteAvecRelations } from '@/types/visits'
import { BreadcrumbVues } from '@/components/tableau-journalier/breadcrumb-vues'
import { NavigationMois } from '@/components/tableau-journalier/navigation-mois'
import { TableauMensuelVisites } from '@/components/tableau-journalier/tableau-mensuel-visites'
import { BoutonsImportExportVisites } from '@/components/tableau-journalier/boutons-import-export-visites'

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

  const visitesRaw = await prisma.visit.findMany({
    where: { date: { gte: debutMois, lt: debutSuivant }, deletedAt: null },
    include: {
      person:     { select: { id: true, nom: true, prenom: true, genre: true, estInscrit: true, _count: { select: { visites: { where: { deletedAt: null } } } } } },
      saisiePar:  { select: { prenom: true, nom: true } },
      modifiePar: { select: { prenom: true, nom: true } },
      demarches:  true,
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

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

      <TableauMensuelVisites
        visitesParJour={visitesParJour}
        badgesParPersonId={badgesParPersonId}
        moisISO={moisISO}
      />
    </main>
  )
}
