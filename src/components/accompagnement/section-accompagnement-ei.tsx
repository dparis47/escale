'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronRight } from 'lucide-react'
import { formaterDateCourte, formaterDateISO } from '@/lib/dates'
import { useRegistrerSauvegarde, useModeEdition } from '@/contexts/sauvegarde-accompagnement'

interface Props {
  accompagnementId: number
  dateEntree:       Date | null
  dateSortie:       Date | null
  observation:      string | null
}

function toInputDate(d: Date | null | undefined): string {
  if (!d) return ''
  return formaterDateISO(new Date(d))
}

export function SectionAccompagnementEI({
  accompagnementId,
  dateEntree,
  dateSortie,
  observation,
}: Props) {
  const router      = useRouter()
  const modeEdition = useModeEdition()
  const [ouvert, setOuvert] = useState(true)

  const [dateSortieVal,  setDateSortieVal]  = useState(toInputDate(dateSortie))
  const [observationVal, setObservationVal] = useState(observation ?? '')
  const [erreur, setErreur] = useState('')

  async function sauvegarder() {
    setErreur('')
    try {
      const res = await fetch(`/api/accompagnement/${accompagnementId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          dateSortie:  dateSortieVal || null,
          observation: observationVal || null,
        }),
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

  useRegistrerSauvegarde('accompagnement-ei', sauvegarder)

  return (
    <>
      <h2
        onClick={() => setOuvert((o) => !o)}
        className="mb-3 mt-6 flex cursor-pointer select-none items-center gap-2 rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-blue-700 hover:text-blue-800"
      >
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${ouvert ? 'rotate-90' : ''}`} />
        Dossier individuel
      </h2>
      {ouvert && (
        <div className="space-y-3">
          {/* Date d'entrée — lecture seule (= date de création) */}
          <div className="flex gap-2 py-0.5 text-sm">
            <span className="w-40 shrink-0 text-muted-foreground">{"Date d'entrée"}</span>
            <span>{dateEntree ? formaterDateCourte(dateEntree) : '—'}</span>
          </div>

          {/* Date de sortie — éditable */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date de sortie</Label>
            <Input
              type="date"
              value={dateSortieVal}
              onChange={(e) => setDateSortieVal(e.target.value)}
              className="h-8 max-w-xs text-sm"
              disabled={!modeEdition}
            />
          </div>

          {/* Observation */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Observation</Label>
            <textarea
              value={observationVal}
              onChange={(e) => setObservationVal(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[72px] resize-y"
              placeholder="Notes libres…"
              disabled={!modeEdition}
            />
          </div>

          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        </div>
      )}
    </>
  )
}
