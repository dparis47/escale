'use client'

import { ArbreDemarches } from '@/components/demarches/arbre-demarches'
import type { DemarcheChamps } from '@/lib/demarches'

interface Props {
  demarches:         DemarcheChamps
  onDemarchesChange: (d: DemarcheChamps) => void
  dateISO?:          string
}

export function SectionMotifs({ demarches, onDemarchesChange, dateISO }: Props) {
  return <ArbreDemarches champs={demarches} onChange={onDemarchesChange} dateISO={dateISO} />
}
