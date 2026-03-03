import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Ressource } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { SelecteurAnnee } from '@/components/bilans/selecteur-annee'
import { BoutonExport } from '@/components/bilans/bouton-export'
import { Button } from '@/components/ui/button'
import { fromPrisma, themesActifs, ARBRE_DEMARCHES } from '@/lib/demarches'

const RESSOURCE_FR: Record<Ressource, string> = {
  RSA:           'RSA',
  ARE:           'ARE',
  ASS:           'ASS',
  AAH:           'AAH',
  INVALIDITE:    'Invalidité',
  IJ:            'IJ (Indemnités journalières)',
  ASI:           'ASI',
  SALAIRE:       'Salaire',
  CONJOINT:      'Ressources conjoint·e',
  SANS_RESSOURCE: 'Sans ressources',
}

const TRANCHES_ORDRE = ['< 25 ans', '25–29 ans', '30–34 ans', '35–39 ans', '40–44 ans', '45–49 ans', '50–54 ans', '55–60 ans', '> 60 ans', 'Non renseigné']

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

export default async function BilanFSEPage({
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
  const debut         = parseISO(`${annee}-01-01`)
  const fin           = parseISO(`${annee}-12-31`)

  const premiereVisite = await prisma.visit.findFirst({
    where:   { deletedAt: null },
    orderBy: { date: 'asc' },
    select:  { date: true },
  })
  const anneeMin = premiereVisite ? premiereVisite.date.getFullYear() : anneeActuelle

  // 1. Visites marquées FSE cette année
  const visitesFSE = await prisma.visit.findMany({
    where:  { deletedAt: null, fse: true, date: { gte: debut, lte: fin } },
    select: {
      personId: true,
      person:   { select: { id: true, genre: true, dateNaissance: true, ressources: true, estInscrit: true } },
    },
  })

  // Dédoublonnage des personnes FSE
  type PersonFSE = { genre: string; dateNaissance: Date | null; ressources: Ressource[]; estInscrit: boolean }
  const personnesMap = new Map<number, PersonFSE>()

  for (const v of visitesFSE) {
    if (!personnesMap.has(v.personId)) {
      personnesMap.set(v.personId, {
        genre:         v.person.genre,
        dateNaissance: v.person.dateNaissance,
        ressources:    v.person.ressources,
        estInscrit:    v.person.estInscrit,
      })
    }
  }

  const nbAvecFiche  = [...personnesMap.values()].filter((p) => p.estInscrit).length
  const nbSansFiche  = personnesMap.size - nbAvecFiche
  const totalFSE     = personnesMap.size
  const toutesPersonnes = [...personnesMap.values()]

  const nbHommes = toutesPersonnes.filter((p) => p.genre === 'HOMME').length
  const nbFemmes = toutesPersonnes.filter((p) => p.genre === 'FEMME').length

  // Tranches d'âge (avec fiche uniquement)
  const tranchesMap = new Map<string, number>()
  for (const t of TRANCHES_ORDRE) tranchesMap.set(t, 0)
  for (const p of toutesPersonnes.filter((p) => p.estInscrit)) {
    const t = trancheAge(p.dateNaissance, annee)
    tranchesMap.set(t, (tranchesMap.get(t) ?? 0) + 1)
  }

  // Ressources (avec fiche uniquement)
  const ressourcesMap = new Map<Ressource, number>()
  for (const p of toutesPersonnes.filter((p) => p.estInscrit)) {
    for (const r of p.ressources) {
      ressourcesMap.set(r, (ressourcesMap.get(r) ?? 0) + 1)
    }
  }
  const nbRessourcesInconnues = toutesPersonnes.filter((p) => p.estInscrit && p.ressources.length === 0).length

  // 2. Toutes les visites des personnes FSE cette année (pour les démarches)
  const personFSEIds = [...personnesMap.keys()]
  const toutesVisitesFSE = personFSEIds.length === 0 ? [] : await prisma.visit.findMany({
    where: {
      deletedAt: null,
      date:      { gte: debut, lte: fin },
      personId:  { in: personFSEIds },
    },
    include: { demarches: true },
  })

  // Comptage des démarches par thème
  const themesMap = new Map<string, number>()
  for (const v of toutesVisitesFSE) {
    if (v.demarches) {
      const actifs = themesActifs(fromPrisma(v.demarches as unknown as Record<string, unknown>))
      for (const id of actifs) {
        themesMap.set(id, (themesMap.get(id) ?? 0) + 1)
      }
    }
  }

  const nbOrienteParFT = toutesVisitesFSE.filter((v) => v.orienteParFT).length

  return (
    <main className="container mx-auto px-4 py-6 space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href="/bilans" className="hover:underline">Bilans</Link>
            {' / '}FSE+
          </div>
          <h1 className="text-2xl font-bold">Bilan FSE+ — {annee}</h1>
        </div>
        <div className="flex items-center gap-3">
          <SelecteurAnnee anneeMin={anneeMin} anneeMax={anneeActuelle} anneeSelectionnee={annee} />
          <BoutonExport type="fse" annee={annee} />
        </div>
      </div>

      {/* Synthèse */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Personnes accompagnées</h2>
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
                <td className="px-4 py-2 font-medium">Total personnes FSE+</td>
                <td className="px-4 py-2 text-right font-bold">{totalFSE}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 pl-8 text-muted-foreground">dont avec fiche</td>
                <td className="px-4 py-2 text-right">{nbAvecFiche}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 pl-8 text-muted-foreground">dont sans fiche</td>
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
              {TRANCHES_ORDRE.map((t) => (
                <tr key={t} className="border-t">
                  <td className="px-4 py-2">{t}</td>
                  <td className="px-4 py-2 text-right font-medium">{tranchesMap.get(t) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ressources */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Ressources
          <span className="ml-2 text-sm font-normal text-muted-foreground">(personnes avec fiche)</span>
        </h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-right">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {(Object.entries(RESSOURCE_FR) as [Ressource, string][]).map(([cle, label]) => (
                <tr key={cle} className="border-t">
                  <td className="px-4 py-2">{label}</td>
                  <td className="px-4 py-2 text-right font-medium">{ressourcesMap.get(cle) ?? 0}</td>
                </tr>
              ))}
              <tr className="border-t">
                <td className="px-4 py-2 text-muted-foreground">Ressources non renseignées</td>
                <td className="px-4 py-2 text-right">{nbRessourcesInconnues}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Démarches par thématique */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Démarches réalisées
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({toutesVisitesFSE.length} visite{toutesVisitesFSE.length > 1 ? 's' : ''} au total des personnes FSE+)
          </span>
        </h2>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Thème</th>
                <th className="px-4 py-2 text-right">Nb visites avec démarche</th>
              </tr>
            </thead>
            <tbody>
              {ARBRE_DEMARCHES.map((theme) => (
                <tr key={theme.id} className="border-t">
                  <td className="px-4 py-2">{theme.label}</td>
                  <td className="px-4 py-2 text-right font-medium">{themesMap.get(theme.id) ?? 0}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/20">
                <td className="px-4 py-1.5 pl-8 text-xs text-muted-foreground">↳ Orienté·e par France Travail</td>
                <td className="px-4 py-1.5 text-right text-xs">{nbOrienteParFT}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div>
        <Link href="/bilans">
          <Button variant="ghost" size="sm">← Retour aux bilans</Button>
        </Link>
      </div>
    </main>
  )
}
