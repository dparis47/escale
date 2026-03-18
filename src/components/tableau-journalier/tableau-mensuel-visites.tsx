'use client'

import { Fragment, useState, useMemo } from 'react'
import Link from 'next/link'
import type { VisiteAvecRelations } from '@/types/visits'
import { LigneVisite } from './ligne-visite'
import { BarreFiltresVisites } from './barre-filtres-visites'
import { matchFiltresDemarches } from '@/lib/demarches'
import { formaterDate } from '@/lib/dates'

interface BadgesAccompagnement { fse: boolean; asid: boolean }

interface Props {
  visitesParJour:    { dateISO: string; visites: VisiteAvecRelations[] }[]
  badgesParPersonId: Record<number, BadgesAccompagnement>
  moisISO:           string
}

export function TableauMensuelVisites({ visitesParJour, badgesParPersonId, moisISO }: Props) {
  const [recherche, setRecherche] = useState('')
  const [themeFiltre, setThemeFiltre] = useState<string | null>(null)
  const [champFiltre, setChampFiltre] = useState<string | null>(null)
  const [nbVisitesMin, setNbVisitesMin] = useState<number | null>(null)

  const totalVisites = useMemo(
    () => visitesParJour.reduce((sum, g) => sum + g.visites.length, 0),
    [visitesParJour],
  )

  const visitesParJourFiltrees = useMemo(() => {
    return visitesParJour
      .map((group) => ({
        dateISO: group.dateISO,
        visites: group.visites.filter((v) => {
          // Filtre nom/prénom
          if (recherche.length >= 2) {
            const q = recherche.toLowerCase()
            const nom = `${v.person.nom} ${v.person.prenom}`.toLowerCase()
            if (!nom.includes(q)) return false
          }
          // Filtre thème / démarche
          if (themeFiltre || champFiltre) {
            if (!matchFiltresDemarches(
              v.demarches as unknown as Record<string, unknown> | null,
              themeFiltre,
              champFiltre,
            )) return false
          }
          // Filtre par nombre minimum de visites
          if (nbVisitesMin !== null) {
            if ((v.person._count?.visites ?? 0) < nbVisitesMin) return false
          }
          return true
        }),
      }))
      .filter((group) => group.visites.length > 0)
  }, [visitesParJour, recherche, themeFiltre, champFiltre, nbVisitesMin])

  const totalFiltrees = useMemo(
    () => visitesParJourFiltrees.reduce((sum, g) => sum + g.visites.length, 0),
    [visitesParJourFiltrees],
  )

  if (totalVisites === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Aucune visite enregistrée pour ce mois.
      </p>
    )
  }

  return (
    <>
      <BarreFiltresVisites
        recherche={recherche}
        onRechercheChange={setRecherche}
        themeFiltre={themeFiltre}
        onThemeFiltreChange={setThemeFiltre}
        champFiltre={champFiltre}
        onChampFiltreChange={setChampFiltre}
        nbVisitesMin={nbVisitesMin}
        onNbVisitesMinChange={setNbVisitesMin}
        totalVisites={totalVisites}
        totalFiltrees={totalFiltrees}
      />

      {visitesParJourFiltrees.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Aucune visite ne correspond aux filtres.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-center">Dossier</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Nom / Prénom</th>
                <th className="px-3 py-2 text-left">Motif(s) de la visite</th>
                <th className="px-3 py-2 text-left">Commentaire</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visitesParJourFiltrees.map(({ dateISO, visites }) => (
                <Fragment key={dateISO}>
                  <tr className="bg-blue-50/60">
                    <td colSpan={6} className="px-3 py-2 font-semibold capitalize">
                      <Link
                        href={`/?date=${dateISO}`}
                        className="text-blue-700 hover:underline"
                      >
                        {formaterDate(dateISO)}
                      </Link>
                      <span className="text-muted-foreground font-normal">
                        {' '}— {visites.length} visite{visites.length > 1 ? 's' : ''}
                      </span>
                    </td>
                  </tr>
                  {visites.map((visite) => (
                    <LigneVisite
                      key={visite.id}
                      visite={visite}
                      dateISO={dateISO}
                      badges={badgesParPersonId[visite.personId]}
                    />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
