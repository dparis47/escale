'use client'

import { useState } from 'react'
import type { ServiceSanteChamps, Noeud, NoeudSection } from '@/lib/service-sante'
import {
  ARBRE_SANTE,
  videChamps,
  collectSectionIds,
  sectionsOuvertesInitiales,
} from '@/lib/service-sante'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Props {
  champs: ServiceSanteChamps
  onChange: (champs: ServiceSanteChamps) => void
}

interface NoeudRenduProps {
  noeud: Noeud
  champs: ServiceSanteChamps
  sectionsOuvertes: Set<string>
  onToggleSection: (id: string, noeud: NoeudSection) => void
  onToggleFeuille: (champ: keyof ServiceSanteChamps) => void
}

function NoeudRendu({
  noeud,
  champs,
  sectionsOuvertes,
  onToggleSection,
  onToggleFeuille,
}: NoeudRenduProps) {
  if (noeud.type === 'feuille') {
    const id = `sante-${noeud.champ}`
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={champs[noeud.champ]}
          onCheckedChange={() => onToggleFeuille(noeud.champ)}
        />
        <Label htmlFor={id} className="cursor-pointer font-normal text-sm">
          {noeud.label}
        </Label>
      </div>
    )
  }

  const estOuvert = sectionsOuvertes.has(noeud.id)
  const id = `sante-section-${noeud.id}`

  return (
    <div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={estOuvert}
          onCheckedChange={() => onToggleSection(noeud.id, noeud)}
        />
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {noeud.label}
        </Label>
      </div>
      {estOuvert && (
        <div className="mt-1.5 space-y-1.5 border-l-2 border-muted pl-3">
          {noeud.enfants.map((enfant) => (
            <NoeudRendu
              key={enfant.type === 'feuille' ? enfant.champ : enfant.id}
              noeud={enfant}
              champs={champs}
              sectionsOuvertes={sectionsOuvertes}
              onToggleSection={onToggleSection}
              onToggleFeuille={onToggleFeuille}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SectionSante({ champs, onChange }: Props) {
  const [sectionsOuvertes, setSectionsOuvertes] = useState<Set<string>>(
    () => sectionsOuvertesInitiales(champs),
  )

  function toggleSection(id: string, noeud: NoeudSection) {
    const estOuvert = sectionsOuvertes.has(id)
    const nouvelles = new Set(sectionsOuvertes)
    if (estOuvert) {
      collectSectionIds(noeud).forEach((sid) => nouvelles.delete(sid))
      setSectionsOuvertes(nouvelles)
      onChange(videChamps(champs, noeud))
    } else {
      nouvelles.add(id)
      setSectionsOuvertes(nouvelles)
    }
  }

  function toggleFeuille(champ: keyof ServiceSanteChamps) {
    onChange({ ...champs, [champ]: !champs[champ] })
  }

  return (
    <div className="space-y-1.5 rounded-md border border-blue-100 bg-blue-50/40 p-3">
      {ARBRE_SANTE.map((noeud) => (
        <NoeudRendu
          key={noeud.type === 'feuille' ? noeud.champ : noeud.id}
          noeud={noeud}
          champs={champs}
          sectionsOuvertes={sectionsOuvertes}
          onToggleSection={toggleSection}
          onToggleFeuille={toggleFeuille}
        />
      ))}
    </div>
  )
}
