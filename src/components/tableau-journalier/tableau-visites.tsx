'use client'

import { useState, useMemo } from 'react'
import type { VisiteAvecRelations } from '@/types/visits'
import { LigneVisite } from './ligne-visite'
import { BarreFiltresVisites } from './barre-filtres-visites'
import { matchFiltresDemarches } from '@/lib/demarches'

interface BadgesAccompagnement { fse: boolean; asid: boolean }

interface Props {
  visites:           VisiteAvecRelations[]
  dateISO:           string
  badgesParPersonId: Record<number, BadgesAccompagnement>
}

export function TableauVisites({ visites, dateISO, badgesParPersonId }: Props) {
  const [recherche, setRecherche] = useState('')
  const [themeFiltre, setThemeFiltre] = useState<string | null>(null)
  const [champFiltre, setChampFiltre] = useState<string | null>(null)
  const [nbVisitesMin, setNbVisitesMin] = useState<number | null>(null)

  const visitesFiltrees = useMemo(() => {
    let result = visites

    // Filtre nom/prénom
    if (recherche.length >= 2) {
      const q = recherche.toLowerCase()
      result = result.filter((v) => {
        const nom = `${v.person.nom} ${v.person.prenom}`.toLowerCase()
        return nom.includes(q)
      })
    }

    // Filtre thème / démarche
    if (themeFiltre || champFiltre) {
      result = result.filter((v) =>
        matchFiltresDemarches(
          v.demarches as unknown as Record<string, unknown> | null,
          themeFiltre,
          champFiltre,
        ),
      )
    }

    // Filtre par nombre minimum de visites
    if (nbVisitesMin !== null) {
      result = result.filter((v) => (v.person._count?.visites ?? 0) >= nbVisitesMin)
    }

    return result
  }, [visites, recherche, themeFiltre, champFiltre, nbVisitesMin])

  if (visites.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Aucune visite enregistrée pour ce jour.
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
        totalVisites={visites.length}
        totalFiltrees={visitesFiltrees.length}
      />

      {visitesFiltrees.length === 0 ? (
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
              {visitesFiltrees.map((visite) => (
                <LigneVisite
                  key={visite.id}
                  visite={visite}
                  dateISO={dateISO}
                  badges={badgesParPersonId[visite.personId]}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
