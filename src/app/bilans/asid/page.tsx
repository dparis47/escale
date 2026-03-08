import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO, formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { SelecteurAnnee } from '@/components/bilans/selecteur-annee'
import { BoutonExport } from '@/components/bilans/bouton-export'
import { Button } from '@/components/ui/button'
import { fromPrisma, themesActifs, ARBRE_DEMARCHES } from '@/lib/demarches'
import type { Noeud } from '@/lib/demarches'

/** Collecte récursivement toutes les feuilles (champ + label) d'une liste de nœuds. */
function collectFeuilles(noeuds: Noeud[]): { champ: string; label: string }[] {
  const result: { champ: string; label: string }[] = []
  for (const n of noeuds) {
    if (n.type === 'feuille') result.push({ champ: n.champ, label: n.label })
    else if (n.type === 'section') result.push(...collectFeuilles(n.enfants))
  }
  return result
}

export default async function BilanASIDPage({
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

  // ASID actifs dans l'année = dateEntree <= fin ET (dateSortie IS NULL OU dateSortie >= debut)
  const asids = await prisma.suiviASID.findMany({
    where: {
      accompagnement: {
        deletedAt: null,
        dateEntree: { lte: fin },
        OR: [
          { dateSortie: null },
          { dateSortie: { gte: debut } },
        ],
      },
    },
    include: {
      accompagnement: {
        select: {
          dateEntree: true,
          dateSortie: true,
          person: { select: { id: true, nom: true, prenom: true, genre: true } },
        },
      },
    },
    orderBy: [{ prescripteurNom: 'asc' }, { prescripteurPrenom: 'asc' }],
  })

  // ── Section 1 — Vue d'ensemble ─────────────────────────────
  const total     = asids.length
  const nbEnCours = asids.filter((a) => {
    const ds = a.accompagnement.dateSortie
    return ds === null || ds > fin
  }).length
  const nbSortis  = total - nbEnCours
  const nbHommes  = asids.filter((a) => a.accompagnement.person.genre === 'HOMME').length
  const nbFemmes  = asids.filter((a) => a.accompagnement.person.genre === 'FEMME').length

  // ── Section 2 — Indicateurs annuels ───────────────────────
  // orientationNMoins1 et orientationN sont des Boolean (coché/non coché)
  const nbOrientationNMoins1 = asids.filter((a) => a.orientationNMoins1).length
  const nbOrientationN       = asids.filter((a) => a.orientationN).length
  const sumRenouvellementN   = asids.reduce((s, a) => s + a.renouvellementN, 0)
  const nbSuiviRealise       = asids.filter((a) => a.suiviRealise).length
  const nbSuiviNonRealise    = asids.filter((a) => !a.suiviRealise).length
  const nbReorientation      = asids.filter((a) => a.reorientation).length

  // ── Section 3 — Démarches réalisées ───────────────────────
  const personASIDIds = asids.map((a) => a.accompagnement.person.id)
  const visitesASID = personASIDIds.length === 0 ? [] : await prisma.visit.findMany({
    where: {
      deletedAt: null,
      date:     { gte: debut, lte: fin },
      personId: { in: personASIDIds },
    },
    include: { demarches: true },
  })
  const themesMap = new Map<string, number>()
  for (const v of visitesASID) {
    if (v.demarches) {
      const actifs = themesActifs(fromPrisma(v.demarches as unknown as Record<string, unknown>))
      for (const id of actifs) {
        themesMap.set(id, (themesMap.get(id) ?? 0) + 1)
      }
    }
  }
  const nbOrienteParFT = visitesASID.filter((v) => v.orienteParFT).length

  // Comptage par démarche individuelle (feuille)
  const champsCount = new Map<string, number>()
  for (const v of visitesASID) {
    if (v.demarches) {
      const champs = fromPrisma(v.demarches as unknown as Record<string, unknown>)
      for (const theme of ARBRE_DEMARCHES) {
        for (const { champ } of collectFeuilles(theme.enfants)) {
          if ((champs as Record<string, unknown>)[champ] === true) {
            champsCount.set(champ, (champsCount.get(champ) ?? 0) + 1)
          }
        }
      }
    }
  }
  // Vue détaillée : thème → feuilles avec count > 0
  const detailThemes = ARBRE_DEMARCHES.map((theme) => ({
    id:      theme.id,
    label:   theme.label,
    total:   themesMap.get(theme.id) ?? 0,
    feuilles: collectFeuilles(theme.enfants)
      .map(({ champ, label }) => ({ label, count: champsCount.get(champ) ?? 0 }))
      .filter(({ count }) => count > 0),
  }))

  // ── Section 4 — Par prescripteur ──────────────────────────
  const parPrescripteur = new Map<string, number>()
  for (const a of asids) {
    const key = [a.prescripteurNom, a.prescripteurPrenom].filter(Boolean).join(' ').trim() || 'Non renseigné'
    parPrescripteur.set(key, (parPrescripteur.get(key) ?? 0) + 1)
  }
  const prescripteursTries = [...parPrescripteur.entries()].sort((a, b) => b[1] - a[1])

  return (
    <main className="container mx-auto px-4 py-6 space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href="/bilans" className="hover:underline">Bilans</Link>
            {' / '}ASID
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Bilan ASID — {annee}</h1>
            <BoutonExport type="asid" annee={annee} />
          </div>
        </div>
        <SelecteurAnnee anneeMin={anneeMin} anneeMax={anneeActuelle} anneeSelectionnee={annee} />
      </div>

      {total === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Aucun suivi ASID actif en {annee}.</p>
      ) : (
        <>
          {/* Section 1 — Vue d'ensemble */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Vue d&apos;ensemble</h2>
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
                    <td className="px-4 py-2 font-medium">Total ASID actifs dans l&apos;année</td>
                    <td className="px-4 py-2 text-right font-bold">{total}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 pl-8 text-muted-foreground">dont en cours</td>
                    <td className="px-4 py-2 text-right">{nbEnCours}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 pl-8 text-muted-foreground">dont sortis dans l&apos;année</td>
                    <td className="px-4 py-2 text-right">{nbSortis}</td>
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

          {/* Section 2 — Indicateurs annuels */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Indicateurs annuels</h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Indicateur</th>
                    <th className="px-4 py-2 text-right">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-2">Orientations N−1</td>
                    <td className="px-4 py-2 text-right font-medium">{nbOrientationNMoins1}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2">Orientations N</td>
                    <td className="px-4 py-2 text-right font-medium">{nbOrientationN}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2">Renouvellements N</td>
                    <td className="px-4 py-2 text-right font-medium">{sumRenouvellementN}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2">Suivis réalisés</td>
                    <td className="px-4 py-2 text-right font-medium">{nbSuiviRealise}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2">Suivis non réalisés</td>
                    <td className="px-4 py-2 text-right font-medium">{nbSuiviNonRealise}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2">Réorientations</td>
                    <td className="px-4 py-2 text-right font-medium">{nbReorientation}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 — Démarches réalisées */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Démarches réalisées
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({visitesASID.length} visite{visitesASID.length > 1 ? 's' : ''} au total des personnes ASID)
              </span>
            </h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Démarche</th>
                    <th className="px-4 py-2 text-right">Nb visites</th>
                  </tr>
                </thead>
                <tbody>
                  {detailThemes.flatMap((theme) => [
                    <tr key={`theme-${theme.id}`} className="border-t bg-muted/30">
                      <td className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {theme.label}
                      </td>
                      <td className="px-4 py-1.5 text-right text-xs text-muted-foreground font-medium">
                        {theme.total}
                      </td>
                    </tr>,
                    ...theme.feuilles.map(({ label, count }) => (
                      <tr key={`leaf-${theme.id}-${label}`} className="border-t">
                        <td className="px-4 py-1 pl-8 text-muted-foreground">{label}</td>
                        <td className="px-4 py-1 text-right font-medium">{count}</td>
                      </tr>
                    )),
                  ])}
                  <tr className="border-t bg-muted/20">
                    <td className="px-4 py-1.5 pl-8 text-xs text-muted-foreground">↳ Orienté·e par France Travail</td>
                    <td className="px-4 py-1.5 text-right text-xs">{nbOrienteParFT}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 — Par prescripteur */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Par prescripteur (CMS)</h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Prescripteur</th>
                    <th className="px-4 py-2 text-right">Nb ASID</th>
                  </tr>
                </thead>
                <tbody>
                  {prescripteursTries.map(([nom, nb]) => (
                    <tr key={nom} className="border-t">
                      <td className="px-4 py-2">{nom}</td>
                      <td className="px-4 py-2 text-right font-medium">{nb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 — Liste nominative */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Liste nominative</h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Nom Prénom</th>
                    <th className="px-4 py-2 text-left">Commune</th>
                    <th className="px-4 py-2 text-left">Prescripteur</th>
                    <th className="px-4 py-2 text-left">Référent</th>
                    <th className="px-4 py-2 text-left">Entrée</th>
                    <th className="px-4 py-2 text-left">Sortie</th>
                    <th className="px-4 py-2 text-center">Suivi réalisé</th>
                  </tr>
                </thead>
                <tbody>
                  {asids.map((a) => {
                    const p           = a.accompagnement.person
                    const prescripteur = [a.prescripteurNom, a.prescripteurPrenom].filter(Boolean).join(' ').trim() || '—'
                    const referent     = [a.referentNom, a.referentPrenom].filter(Boolean).join(' ').trim() || '—'
                    return (
                      <tr key={a.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">
                          <Link href={`/accompagnement/${a.accompagnementId}`} className="hover:underline text-blue-700">
                            {p.nom.toUpperCase()} {capitaliserPrenom(p.prenom)}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{a.communeResidence ?? '—'}</td>
                        <td className="px-4 py-2 text-muted-foreground">{prescripteur}</td>
                        <td className="px-4 py-2 text-muted-foreground">{referent}</td>
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          {a.accompagnement.dateEntree ? formaterDateCourte(a.accompagnement.dateEntree) : '—'}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          {a.accompagnement.dateSortie ? formaterDateCourte(a.accompagnement.dateSortie) : '—'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {a.suiviRealise ? (
                            <span className="text-green-700 font-medium">Oui</span>
                          ) : (
                            <span className="text-muted-foreground">Non</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div>
        <Link href="/bilans">
          <Button variant="ghost" size="sm">← Retour aux bilans</Button>
        </Link>
      </div>
    </main>
  )
}
