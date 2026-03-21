import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import { auth } from '@/auth'
import { peutAcceder } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { NavigationAnnee } from '@/components/tableau-journalier/navigation-annee'
import { BoutonExportPartenaires } from '@/components/tableau-journalier/bouton-export-partenaires'
import { TableauPartenaires, PARTENAIRES_FIXES } from '@/components/tableau-journalier/tableau-partenaires'
import { ListePersonnesPartenaire } from '@/components/tableau-journalier/liste-personnes-partenaire'
import { AjouterPartenaire } from '@/components/tableau-journalier/ajouter-partenaire'
import type { JourData } from '@/components/tableau-journalier/tableau-partenaires'
import type { EntreePersonne } from '@/components/tableau-journalier/liste-personnes-partenaire'

const CLES_FIXES = new Set(PARTENAIRES_FIXES.map((p) => p.cle))

export default async function AccueilPartenairesPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams

  const anneeActuelle = new Date().getFullYear()
  const annee = params.annee && /^\d{4}$/.test(params.annee)
    ? parseInt(params.annee)
    : anneeActuelle

  const debutAnnee    = new Date(`${annee}-01-01T00:00:00.000Z`)
  const debutSuivante = new Date(`${annee + 1}-01-01T00:00:00.000Z`)

  const personnesAnnee = await prisma.personnePartenaire.findMany({
    where:   { date: { gte: debutAnnee, lt: debutSuivante }, deletedAt: null },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  // Tableau pivot annuel
  const partenairesLibresSet = new Set<string>()
  const parMap = new Map<string, Record<string, number>>()
  for (const row of personnesAnnee) {
    const iso = (row.date as Date).toISOString().slice(0, 10)
    if (!parMap.has(iso)) parMap.set(iso, {})
    parMap.get(iso)![row.partenaire] = (parMap.get(iso)![row.partenaire] ?? 0) + 1
    if (!CLES_FIXES.has(row.partenaire)) partenairesLibresSet.add(row.partenaire)
  }
  const jours: JourData[] = [...parMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, counts]) => ({
      dateISO: d,
      counts,
      total: Object.values(counts).reduce((s, n) => s + n, 0),
    }))
  const partenairesLibres = [...partenairesLibresSet].sort()

  // Personnes indexées par partenaire (toutes l'année)
  const personnesMap = new Map<string, EntreePersonne[]>()
  for (const p of personnesAnnee) {
    const key = p.partenaire
    if (!personnesMap.has(key)) personnesMap.set(key, [])
    personnesMap.get(key)!.push({
      id:      p.id,
      nom:     p.nom,
      dateRDV: (p.dateRDV as Date).toISOString().slice(0, 10),
    })
  }

  const libresJour = [...partenairesLibresSet].sort()

  const toutesLignes = [
    ...PARTENAIRES_FIXES.map((p) => ({ cle: p.cle, label: p.label })),
    ...libresJour.map((cle) => ({ cle, label: cle })),
  ]

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-blue-700">Accueil partenaires</h1>
            <BoutonExportPartenaires annee={annee} />
            {peutAcceder(session, 'accueil_partenaires', 'importer') && (
              <Link href="/import/partenaires">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Importer Excel"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
          <p className="text-blue-600 font-medium">{annee}</p>
        </div>
        <NavigationAnnee annee={annee} />
      </div>

      <div className="mb-10">
        <TableauPartenaires jours={jours} partenairesLibres={partenairesLibres} />
      </div>

      <div className="rounded-md border border-gray-400 overflow-hidden max-w-2xl">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="border-b-2 border-gray-400 px-3 py-2 text-left text-blue-700">Partenaires</th>
              <th className="border-b-2 border-l-2 border-gray-400 px-3 py-2 text-center w-24 text-blue-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {toutesLignes.map(({ cle, label }, i) => {
              const nb = personnesMap.get(cle)?.length ?? 0
              const fonds = ['bg-blue-50/50', 'bg-green-50/60', 'bg-yellow-50/60', 'bg-pink-50/60', 'bg-purple-50/50', 'bg-orange-50/60']
              const fond = fonds[i % fonds.length]
              return (
                <tr key={cle} className={`border-t-2 border-gray-400 align-top ${fond}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-blue-700">{label}</div>
                    <ListePersonnesPartenaire
                      partenaire={cle}
                      initial={personnesMap.get(cle) ?? []}
                    />
                  </td>
                  <td className="border-l-2 border-gray-400 px-3 py-2 text-center align-middle">
                    <span className="text-sm font-bold tabular-nums text-blue-700">{nb}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AjouterPartenaire />
    </main>
  )
}
