import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { SelecteurAnnee } from '@/components/bilans/selecteur-annee'
import { BoutonExport } from '@/components/bilans/bouton-export'
import { Button } from '@/components/ui/button'

function trancheAge(dateNaissance: Date | null, annee: number): string {
  if (!dateNaissance) return 'Non renseigné'
  const ref = new Date(annee, 0, 1)
  const age = Math.floor((ref.getTime() - dateNaissance.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (age < 25)  return '< 25 ans'
  if (age < 30)  return '25–29 ans'
  if (age < 35)  return '30–34 ans'
  if (age < 40)  return '35–39 ans'
  if (age < 45)  return '40–44 ans'
  if (age < 50)  return '45–49 ans'
  if (age < 55)  return '50–54 ans'
  if (age <= 60) return '55–60 ans'
  return '> 60 ans'
}

const TRANCHES_ORDRE = ['< 25 ans', '25–29 ans', '30–34 ans', '35–39 ans', '40–44 ans', '45–49 ans', '50–54 ans', '55–60 ans', '> 60 ans', 'Non renseigné']

export default async function BilanConseilDepartementalPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'ACCUEIL') redirect('/')

  const params        = await searchParams
  const anneeActuelle = new Date().getFullYear()
  const annee         = Number(params.annee ?? anneeActuelle)

  const debut = parseISO(`${annee}-01-01`)
  const fin   = parseISO(`${annee}-12-31`)

  const premiereVisite = await prisma.visit.findFirst({
    where:   { deletedAt: null },
    orderBy: { date: 'asc' },
    select:  { date: true },
  })
  const anneeMin = premiereVisite ? premiereVisite.date.getFullYear() : anneeActuelle

  // Toutes les visites de l'année avec les données person
  const visites = await prisma.visit.findMany({
    where:  { deletedAt: null, date: { gte: debut, lte: fin } },
    select: {
      personId: true,
      person: {
        select: {
          genre:         true,
          dateNaissance: true,
          ressources:    true,
          estInscrit:    true,
        },
      },
    },
  })

  // Agréger par personId
  const visitesParPerson = new Map<number, typeof visites>()

  for (const v of visites) {
    const liste = visitesParPerson.get(v.personId) ?? []
    liste.push(v)
    visitesParPerson.set(v.personId, liste)
  }

  // Personnes sans fiche = estInscrit false (créées automatiquement lors de la saisie)
  const nbSansFiche = [...visitesParPerson.keys()].filter(
    (pid) => visitesParPerson.get(pid)![0]?.person?.estInscrit === false,
  ).length
  const nbAvecFiche    = visitesParPerson.size - nbSansFiche
  const totalPersonnes = visitesParPerson.size

  // Genre
  let nbHommes = 0
  let nbFemmes = 0
  for (const [, vvv] of visitesParPerson) {
    const genre = vvv[0]?.person?.genre
    if (genre === 'HOMME') nbHommes++
    else nbFemmes++
  }

  // Suivi régulier (≥ 3 visites) vs occasionnel
  let nbRegulier    = 0
  let nbOccasionnel = 0
  for (const [, vvv] of visitesParPerson) {
    if (vvv.length >= 3) nbRegulier++
    else nbOccasionnel++
  }

  // Ressources connues / inconnues / RSA
  let nbRessourcesConnues   = 0
  let nbRessourcesInconnues = 0
  let nbRSA                 = 0
  for (const [, vvv] of visitesParPerson) {
    const ressources = vvv[0]?.person?.ressources ?? []
    if (ressources.length > 0) {
      nbRessourcesConnues++
      if (ressources.includes('RSA')) nbRSA++
    } else {
      nbRessourcesInconnues++
    }
  }

  // Tranches d'âge (personnes avec fiche uniquement)
  const tranchesMap = new Map<string, number>()
  for (const t of TRANCHES_ORDRE) tranchesMap.set(t, 0)
  for (const [, vvv] of visitesParPerson) {
    const dateNaissance = vvv[0]?.person?.dateNaissance ?? null
    const tranche       = trancheAge(dateNaissance, annee)
    tranchesMap.set(tranche, (tranchesMap.get(tranche) ?? 0) + 1)
  }

  // Ateliers de l'année
  type CompteurRow = { themeNom: string; nbSeances: bigint; nbAvecFiche: bigint; nbSansFiche: bigint }
  const atelierRows = await prisma.$queryRaw<CompteurRow[]>(Prisma.sql`
    SELECT
      t.nom AS "themeNom",
      COUNT(DISTINCT ac.id)                                                            AS "nbSeances",
      COUNT(DISTINCT pa."personId") FILTER (WHERE pa."deletedAt" IS NULL)              AS "nbAvecFiche",
      0::bigint                                                                        AS "nbSansFiche"
    FROM "ActionCollective" ac
    JOIN "ThemeAtelierRef" t ON t.id = ac."themeId"
    LEFT JOIN "ParticipationAtelier" pa ON pa."actionCollectiveId" = ac.id
    WHERE ac."deletedAt" IS NULL
      AND ac.date BETWEEN ${debut} AND ${fin}
    GROUP BY t.nom
    ORDER BY t.nom
  `)

  const atelierStats = atelierRows.map((r) => ({
    theme:       r.themeNom,
    nbSeances:   Number(r.nbSeances),
    nbAvecFiche: Number(r.nbAvecFiche),
    nbSansFiche: Number(r.nbSansFiche),
    total:       Number(r.nbAvecFiche) + Number(r.nbSansFiche),
  })).sort((a, b) => a.theme.localeCompare(b.theme, 'fr'))

  const totalSeances      = atelierStats.reduce((s, a) => s + a.nbSeances, 0)
  const totalParticipants = atelierStats.reduce((s, a) => s + a.total, 0)

  return (
    <main className="container mx-auto px-4 py-6 space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href="/bilans" className="hover:underline">Bilans</Link>
            {' / '}Conseil Départemental
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Bilan Conseil Départemental — {annee}</h1>
            <BoutonExport type="conseil-departemental" annee={annee} />
          </div>
        </div>
        <SelecteurAnnee anneeMin={anneeMin} anneeMax={anneeActuelle} anneeSelectionnee={annee} />
      </div>

      {/* Synthèse générale */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Personnes accueillies</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Indicateur</th>
                <th className="px-4 py-2 text-right">Nombre</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2 font-medium">Total personnes accueillies</td>
                <td className="px-4 py-2 text-right font-bold">{totalPersonnes}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 pl-8 text-muted-foreground">dont avec fiche</td>
                <td className="px-4 py-2 text-right">{nbAvecFiche}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 pl-8 text-muted-foreground">dont sans fiche (fiche à créer)</td>
                <td className="px-4 py-2 text-right">{nbSansFiche}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Hommes</td>
                <td className="px-4 py-2 text-right font-medium">{nbHommes}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Femmes</td>
                <td className="px-4 py-2 text-right font-medium">{nbFemmes}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Suivi régulier (≥ 3 visites dans l&apos;année)</td>
                <td className="px-4 py-2 text-right font-medium">{nbRegulier}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Suivi occasionnel (1–2 visites)</td>
                <td className="px-4 py-2 text-right font-medium">{nbOccasionnel}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Ressources connues</td>
                <td className="px-4 py-2 text-right font-medium">{nbRessourcesConnues}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Ressources non renseignées</td>
                <td className="px-4 py-2 text-right font-medium">{nbRessourcesInconnues}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Bénéficiaires RSA</td>
                <td className="px-4 py-2 text-right font-medium">{nbRSA}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Tranches d'âge */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Tranches d&apos;âge
          <span className="ml-2 text-sm font-normal text-muted-foreground">(personnes avec fiche, âge au 01/01/{annee})</span>
        </h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Tranche</th>
                <th className="px-4 py-2 text-right">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {TRANCHES_ORDRE.map((tranche) => (
                <tr key={tranche} className="border-t">
                  <td className="px-4 py-2">{tranche}</td>
                  <td className="px-4 py-2 text-right font-medium">{tranchesMap.get(tranche) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ateliers */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Ateliers collectifs
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            — {totalSeances} séance{totalSeances > 1 ? 's' : ''}, {totalParticipants} participation{totalParticipants > 1 ? 's' : ''}
          </span>
        </h2>
        {atelierStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun atelier organisé en {annee}.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Thème</th>
                  <th className="px-4 py-2 text-right">Séances</th>
                  <th className="px-4 py-2 text-right">Avec fiche</th>
                  <th className="px-4 py-2 text-right">Fiche à créer</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {atelierStats.map((a) => (
                  <tr key={a.theme} className="border-t">
                    <td className="px-4 py-2">{a.theme}</td>
                    <td className="px-4 py-2 text-right">{a.nbSeances}</td>
                    <td className="px-4 py-2 text-right">{a.nbAvecFiche}</td>
                    <td className="px-4 py-2 text-right">{a.nbSansFiche}</td>
                    <td className="px-4 py-2 text-right font-medium">{a.total}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-medium">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">{totalSeances}</td>
                  <td className="px-4 py-2 text-right">{atelierStats.reduce((s, a) => s + a.nbAvecFiche, 0)}</td>
                  <td className="px-4 py-2 text-right">{atelierStats.reduce((s, a) => s + a.nbSansFiche, 0)}</td>
                  <td className="px-4 py-2 text-right">{totalParticipants}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div>
        <Link href="/bilans">
          <Button variant="ghost" size="sm">← Retour aux bilans</Button>
        </Link>
      </div>
    </main>
  )
}
