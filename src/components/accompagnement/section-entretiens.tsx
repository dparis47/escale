'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formaterDateCourte, formaterDateISO } from '@/lib/dates'
import { SUJETS_ENTRETIEN, SUJETS_ENTRETIEN_FR } from '@/schemas/accompagnement'
import type { EntretienAvecSujets } from '@/types/accompagnement'
import type { SujetEntretien } from '@prisma/client'

interface Props {
  accompagnementId: number
  entretiens:       EntretienAvecSujets[]
}

interface FormEntretien {
  date:   string
  sujets: SujetEntretien[]
  notes:  string
}

function FormulaireEntretien({
  initial,
  onSave,
  onCancel,
  enChargement,
  erreur,
}: {
  initial:      FormEntretien
  onSave:       (data: FormEntretien) => void
  onCancel:     () => void
  enChargement: boolean
  erreur:       string
}) {
  const [date,   setDate]   = useState(initial.date)
  const [sujets, setSujets] = useState<SujetEntretien[]>(initial.sujets)
  const [notes,  setNotes]  = useState(initial.notes)

  function toggleSujet(sujet: SujetEntretien) {
    setSujets((prev) =>
      prev.includes(sujet) ? prev.filter((s) => s !== sujet) : [...prev, sujet],
    )
  }

  return (
    <div className="rounded border p-4 space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm">Date *</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
      </div>
      <div>
        <Label className="mb-2 block text-sm">Sujets abordés</Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {SUJETS_ENTRETIEN.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <Checkbox id={`sujet-${s}`} checked={sujets.includes(s)} onCheckedChange={() => toggleSujet(s)} />
              <Label htmlFor={`sujet-${s}`} className="cursor-pointer font-normal text-sm">
                {SUJETS_ENTRETIEN_FR[s]}
              </Label>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Notes</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm min-h-[60px] resize-y"
          placeholder="Notes libres…"
        />
      </div>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      <div className="flex gap-2">
        <Button onClick={() => onSave({ date, sujets, notes })} disabled={enChargement} size="sm">
          {enChargement ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
      </div>
    </div>
  )
}

export function SectionEntretiens({ accompagnementId, entretiens }: Props) {
  const router = useRouter()
  const [ajouterOuvert,  setAjouterOuvert]  = useState(false)
  const [modifierOuvert, setModifierOuvert] = useState<number | null>(null)
  const [erreur,         setErreur]         = useState('')
  const [enChargement,   setEnChargement]   = useState(false)

  async function ajouterEntretien(data: FormEntretien) {
    setErreur('')
    if (!data.date) { setErreur('La date est obligatoire.'); return }
    setEnChargement(true)
    try {
      const res = await fetch(`/api/accompagnement/${accompagnementId}/entretiens`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: data.date, sujets: data.sujets, notes: data.notes || undefined }),
      })
      if (!res.ok) {
        const d = await res.json() as { erreur?: string }
        setErreur(d.erreur ?? "Erreur lors de l'ajout.")
        return
      }
      setAjouterOuvert(false)
      router.refresh()
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  async function modifierEntretien(eid: number, data: FormEntretien) {
    setErreur('')
    if (!data.date) { setErreur('La date est obligatoire.'); return }
    setEnChargement(true)
    try {
      const res = await fetch(`/api/accompagnement/${accompagnementId}/entretiens/${eid}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: data.date, sujets: data.sujets, notes: data.notes || undefined }),
      })
      if (!res.ok) {
        const d = await res.json() as { erreur?: string }
        setErreur(d.erreur ?? 'Erreur lors de la modification.')
        return
      }
      setModifierOuvert(null)
      router.refresh()
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  async function supprimerEntretien(eid: number) {
    if (!confirm('Supprimer cet entretien ?')) return
    await fetch(`/api/accompagnement/${accompagnementId}/entretiens/${eid}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      {entretiens.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Aucun entretien enregistré.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {entretiens.map((e) => (
            <li key={e.id} className="rounded border p-3 text-sm">
              {modifierOuvert === e.id ? (
                <FormulaireEntretien
                  initial={{
                    date:   formaterDateISO(new Date(e.date)),
                    sujets: e.sujets as SujetEntretien[],
                    notes:  e.notes ?? '',
                  }}
                  onSave={(data) => modifierEntretien(e.id, data)}
                  onCancel={() => { setModifierOuvert(null); setErreur('') }}
                  enChargement={enChargement}
                  erreur={erreur}
                />
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium">{formaterDateCourte(e.date)}</span>
                    {(e.sujets as SujetEntretien[]).length > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        {(e.sujets as SujetEntretien[])
                          .map((s) => SUJETS_ENTRETIEN_FR[s])
                          .join(' · ')}
                      </span>
                    )}
                    {e.notes && <p className="mt-1 text-muted-foreground">{e.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { setModifierOuvert(e.id); setErreur('') }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => supprimerEntretien(e.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {ajouterOuvert ? (
        <FormulaireEntretien
          initial={{ date: '', sujets: [], notes: '' }}
          onSave={ajouterEntretien}
          onCancel={() => { setAjouterOuvert(false); setErreur('') }}
          enChargement={enChargement}
          erreur={erreur}
        />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAjouterOuvert(true)}>
          + Ajouter un entretien
        </Button>
      )}
    </div>
  )
}
