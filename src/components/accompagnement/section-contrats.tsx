'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useModeEdition } from '@/contexts/sauvegarde-accompagnement'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formaterDateCourte } from '@/lib/dates'
import { TYPE_CONTRAT, type TypeContratEnum } from '@/schemas/accompagnement'
import type { ContratTravailSimple } from '@/types/accompagnement'

const TYPE_CONTRAT_LABELS: Record<TypeContratEnum, string> = {
  CDI:     'CDI',
  CDD:     'CDD',
  CDDI:    'CDDI',
  INTERIM: 'Intérim',
}

interface Props {
  accompagnementId: number
  contrats:         ContratTravailSimple[]
}

interface FormContrat {
  type:      TypeContratEnum
  dateDebut: string
  dateFin:   string
  employeur: string
  ville:     string
  poste:     string
}

const VIDE: FormContrat = { type: 'CDI', dateDebut: '', dateFin: '', employeur: '', ville: '', poste: '' }

function avecDateFin(type: TypeContratEnum) {
  return type === 'CDD' || type === 'INTERIM' || type === 'CDDI'
}

function toInputDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

function FormContratUI({
  f, setF, onAnnuler, titre, erreur,
}: {
  f: FormContrat
  setF: React.Dispatch<React.SetStateAction<FormContrat>>
  onAnnuler: () => void
  titre: string
  erreur: string
}) {
  return (
    <div className="rounded border p-3 space-y-3 bg-muted/30">
      <p className="text-xs font-medium">{titre}</p>
      <div className="space-y-1">
        <Label className="text-xs">Type de contrat *</Label>
        <Select
          value={f.type}
          onValueChange={(v) => setF((prev) => ({ ...prev, type: v as TypeContratEnum, dateFin: '' }))}
        >
          <SelectTrigger className="h-8 text-sm max-w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_CONTRAT.map((t) => (
              <SelectItem key={t} value={t}>{TYPE_CONTRAT_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Date de début *</Label>
          <Input
            type="date"
            value={f.dateDebut}
            onChange={(e) => setF((prev) => ({ ...prev, dateDebut: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        {avecDateFin(f.type) && (
          <div className="space-y-1">
            <Label className="text-xs">Date de fin</Label>
            <Input
              type="date"
              value={f.dateFin}
              onChange={(e) => setF((prev) => ({ ...prev, dateFin: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Employeur</Label>
          <Input value={f.employeur} onChange={(e) => setF((prev) => ({ ...prev, employeur: e.target.value }))} className="h-8 text-sm" maxLength={200} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ville</Label>
          <Input value={f.ville} onChange={(e) => setF((prev) => ({ ...prev, ville: e.target.value }))} className="h-8 text-sm" maxLength={200} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Intitulé du poste</Label>
          <Input value={f.poste} onChange={(e) => setF((prev) => ({ ...prev, poste: e.target.value }))} className="h-8 text-sm" maxLength={200} />
        </div>
      </div>
      {erreur && <p className="text-xs text-destructive">{erreur}</p>}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onAnnuler}>Annuler</Button>
      </div>
    </div>
  )
}

export function SectionContrats({ accompagnementId, contrats: contratsInit }: Props) {
  const modeEdition = useModeEdition()

  const [contrats,          setContrats]          = useState<ContratTravailSimple[]>(contratsInit)
  const [ajouterOuvert,     setAjouterOuvert]     = useState(false)
  const [modifierContratId, setModifierContratId] = useState<number | null>(null)
  const [form,              setForm]              = useState<FormContrat>(VIDE)
  const [formModifier,      setFormModifier]      = useState<FormContrat>(VIDE)
  const [contratErreur,     setContratErreur]     = useState('')

  function ouvrirAjouter() {
    setAjouterOuvert(true)
    setModifierContratId(null)
    setContratErreur('')
    setForm(VIDE)
  }

  function ouvrirModifier(c: ContratTravailSimple) {
    setModifierContratId(c.id)
    setAjouterOuvert(false)
    setContratErreur('')
    setFormModifier({
      type:      c.type as TypeContratEnum,
      dateDebut: toInputDate(c.dateDebut),
      dateFin:   toInputDate(c.dateFin),
      employeur: c.employeur ?? '',
      ville:     c.ville     ?? '',
      poste:     c.poste     ?? '',
    })
  }

  async function ajouterContrat() {
    if (!form.dateDebut) {
      setContratErreur('La date de début est obligatoire.')
      return
    }
    const body = {
      type:      form.type,
      dateDebut: form.dateDebut,
      dateFin:   avecDateFin(form.type) && form.dateFin ? form.dateFin : undefined,
      employeur: form.employeur || undefined,
      ville:     form.ville     || undefined,
      poste:     form.poste     || undefined,
    }
    const res = await fetch(`/api/accompagnement/${accompagnementId}/contrats`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json() as { erreur?: string }
      setContratErreur(data.erreur ?? "Erreur lors de l'ajout.")
      return
    }
    const nouveau = await res.json() as ContratTravailSimple
    setContrats((prev) => [...prev, nouveau])
    setForm(VIDE)
    setAjouterOuvert(false)
    setContratErreur('')
  }

  async function modifierContrat(cid: number) {
    if (!formModifier.dateDebut) {
      setContratErreur('La date de début est obligatoire.')
      return
    }
    const body = {
      type:      formModifier.type,
      dateDebut: formModifier.dateDebut,
      dateFin:   avecDateFin(formModifier.type) && formModifier.dateFin ? formModifier.dateFin : undefined,
      employeur: formModifier.employeur || undefined,
      ville:     formModifier.ville     || undefined,
      poste:     formModifier.poste     || undefined,
    }
    const res = await fetch(`/api/accompagnement/${accompagnementId}/contrats/${cid}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json() as { erreur?: string }
      setContratErreur(data.erreur ?? 'Erreur lors de la modification.')
      return
    }
    const maj = await res.json() as ContratTravailSimple
    setContrats((prev) => prev.map((c) => c.id === cid ? maj : c))
    setModifierContratId(null)
    setContratErreur('')
  }

  async function supprimerContrat(cid: number) {
    if (!confirm('Supprimer ce contrat ?')) return
    await fetch(`/api/accompagnement/${accompagnementId}/contrats/${cid}`, { method: 'DELETE' })
    setContrats((prev) => prev.filter((c) => c.id !== cid))
  }

  return (
    <div className="space-y-2">
      {contrats.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucun contrat enregistré.</p>
      )}
      {contrats.map((c) => (
        modifierContratId === c.id ? (
          <FormContratUI
            key={c.id}
            f={formModifier}
            setF={setFormModifier}
            onAnnuler={() => { setModifierContratId(null); setContratErreur('') }}
            titre={`Modifier — ${TYPE_CONTRAT_LABELS[c.type as TypeContratEnum]}`}
            erreur={contratErreur}
          />
        ) : (
          <div key={c.id} className="flex items-start gap-2 text-sm rounded border px-3 py-1.5">
            <div className="flex-1">
              <span className="font-medium">{TYPE_CONTRAT_LABELS[c.type as TypeContratEnum]}</span>
              <span className="ml-2 text-muted-foreground">{formaterDateCourte(c.dateDebut)}</span>
              {c.dateFin   && <span className="text-muted-foreground"> → {formaterDateCourte(c.dateFin)}</span>}
              {c.employeur && <span className="ml-2">{c.employeur}</span>}
              {c.ville     && <span className="ml-1 text-muted-foreground">· {c.ville}</span>}
              {c.poste     && <span className="ml-1 text-muted-foreground">· {c.poste}</span>}
            </div>
            {modeEdition && (
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="outline" size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => ouvrirModifier(c)}
                  disabled={ajouterOuvert || modifierContratId !== null}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive h-6 px-1.5 text-xs"
                  onClick={() => supprimerContrat(c.id)}
                  disabled={ajouterOuvert || modifierContratId !== null}
                >
                  Supprimer
                </Button>
              </div>
            )}
          </div>
        )
      ))}
      {modeEdition && modifierContratId === null && (
        ajouterOuvert ? (
          <>
            <FormContratUI
              f={form}
              setF={setForm}
              onAnnuler={() => { setAjouterOuvert(false); setContratErreur(''); setForm(VIDE) }}
              titre="Ajouter un contrat"
              erreur={contratErreur}
            />
            <Button size="sm" onClick={ajouterContrat}>Enregistrer le contrat</Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={ouvrirAjouter}>+ Ajouter un contrat</Button>
        )
      )}
      {modifierContratId !== null && (
        <Button size="sm" onClick={() => modifierContrat(modifierContratId)}>
          Enregistrer la modification
        </Button>
      )}
    </div>
  )
}
