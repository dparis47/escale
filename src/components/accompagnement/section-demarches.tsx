'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRegistrerSauvegarde, useModeEdition } from '@/contexts/sauvegarde-accompagnement'
import { ArbreDemarches } from '@/components/demarches/arbre-demarches'
import { fromPrisma, DEMARCHE_VIDE, type DemarcheChamps } from '@/lib/demarches'
import type { Demarches } from '@prisma/client'

interface Props {
  accompagnementId: number
  demarches:        Demarches | null
}

export function SectionDemarches({ accompagnementId, demarches: init }: Props) {
  const router      = useRouter()
  const modeEdition = useModeEdition()

  const [demarches, setDemarches] = useState<DemarcheChamps>(
    init ? fromPrisma(init as unknown as Record<string, unknown>) : DEMARCHE_VIDE
  )
  const [erreur, setErreur] = useState('')

  async function enregistrer() {
    try {
      const res = await fetch(`/api/accompagnement/${accompagnementId}/demarches`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(demarches),
      })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreur(data.erreur ?? "Erreur lors de l'enregistrement.")
        throw new Error(data.erreur ?? 'Erreur')
      }
      setErreur('')
      router.refresh()
    } catch (e) {
      if (e instanceof Error && e.message !== 'Erreur') setErreur('Erreur réseau.')
      throw e
    }
  }

  useRegistrerSauvegarde('demarches', enregistrer)

  return (
    <div>
      <ArbreDemarches
        champs={demarches}
        onChange={setDemarches}
        disabled={!modeEdition}
      />
      {erreur && <p className="text-sm text-destructive mt-3">{erreur}</p>}
    </div>
  )
}
