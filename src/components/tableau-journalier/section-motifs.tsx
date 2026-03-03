'use client'

import { ArbreDemarches } from '@/components/demarches/arbre-demarches'
import type { DemarcheChamps } from '@/lib/demarches'

interface Props {
  demarches:         DemarcheChamps
  onDemarchesChange: (d: DemarcheChamps) => void
}

export function SectionMotifs({ demarches, onDemarchesChange }: Props) {
  return <ArbreDemarches champs={demarches} onChange={onDemarchesChange} />
}
