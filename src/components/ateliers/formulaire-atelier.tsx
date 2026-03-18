'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formaterDateISO } from '@/lib/dates'
import { DialogueGererPrestataires } from '@/components/ateliers/dialogue-prestataire'
import { DialogueGererThemes } from '@/components/ateliers/dialogue-theme'
import type { CategorieAvecThemes, PrestataireOption } from '@/schemas/atelier'

type Mode = 'creation' | 'edition' | 'edition-groupe'

interface AtelierData {
  id:            number
  themeId:       number
  themeNom:      string
  themeAutre:    string | null
  prestataireId: number | null
  lieu:          string | null
  date:          Date
  notes:         string | null
}

interface SeanceExistante {
  id:         number
  date:       Date
  themeAutre: string | null
}

interface Props {
  mode:                  Mode
  atelier?:              AtelierData
  seancesExistantes?:    SeanceExistante[]
  retourUrl?:            string
  defaultThemeId?:       number
  defaultPrestataireId?: number
  defaultLieu?:          string
}

interface Seance {
  date:       string
  themeAutre: string
}

function toInputDate(d: Date | null | undefined): string {
  if (!d) return ''
  return formaterDateISO(new Date(d))
}

function Champ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

function labelTitre(themeNom: string): string {
  const n = themeNom.toLowerCase()
  if (n.includes('cinéma')) return 'Titre du film'
  return 'Titre de la séance'
}

function placeholderTitre(themeNom: string): string {
  const n = themeNom.toLowerCase()
  if (n.includes('cinéma')) return 'Ex : Les Misérables'
  return 'Optionnel…'
}

/** Champ texte avec menu déroulant de suggestions */
function InputTitre({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: {
  value:       string
  onChange:    (v: string) => void
  suggestions: string[]
  placeholder?: string
  className?:  string
}) {
  const [ouvert, setOuvert] = useState(false)

  const correspondances = suggestions.filter((s) =>
    value.trim() === '' || s.toLowerCase().includes(value.toLowerCase())
  )

  return (
    <div className={`relative ${className ?? ''}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        placeholder={placeholder}
        maxLength={200}
        autoComplete="off"
      />
      {ouvert && correspondances.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-md">
          {correspondances.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(s); setOuvert(false) }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionSeances({
  seances,
  onModifier,
  onRetirer,
  onAjouter,
  themeNom,
  suggestions,
  titre,
  minUne,
}: {
  seances:     Seance[]
  onModifier:  (i: number, champ: keyof Seance, v: string) => void
  onRetirer:   (i: number) => void
  onAjouter:   () => void
  themeNom:    string
  suggestions: string[]
  titre?:      string
  minUne?:     boolean
}) {
  return (
    <div className="space-y-2">
      {titre && <p className="text-sm font-medium">{titre}</p>}
      <div className="grid grid-cols-[180px_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
        <span>Date <span className="text-destructive">*</span></span>
        <span>{themeNom ? labelTitre(themeNom) : 'Titre de la séance'}</span>
        <span />
      </div>
      {seances.map((s, i) => {
        const titresDansLeFormulaire = seances
          .filter((autre, j) => j !== i && autre.themeAutre.trim() !== '')
          .map((autre) => autre.themeAutre)
        const suggestionsEffectives = [...new Set([...suggestions, ...titresDansLeFormulaire])]
        return (
          <div key={i} className="grid grid-cols-[180px_1fr_auto] items-center gap-2">
            <Input
              type="date"
              value={s.date}
              onChange={(e) => onModifier(i, 'date', e.target.value)}
            />
            <InputTitre
              value={s.themeAutre}
              onChange={(v) => onModifier(i, 'themeAutre', v)}
              suggestions={suggestionsEffectives}
              placeholder={themeNom ? placeholderTitre(themeNom) : 'Optionnel…'}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onRetirer(i)}
              disabled={minUne && seances.length === 1}
            >
              ✕
            </Button>
          </div>
        )
      })}
      <Button type="button" variant="outline" size="sm" onClick={onAjouter}>
        + Ajouter une séance
      </Button>
    </div>
  )
}

export function FormulaireAtelier({ mode, atelier, seancesExistantes, retourUrl, defaultThemeId, defaultPrestataireId, defaultLieu }: Props) {
  const router = useRouter()

  const [themeId,       setThemeId]       = useState<number | null>(atelier?.themeId ?? defaultThemeId ?? null)
  const [prestataireId, setPrestataireId] = useState<number | null>(atelier?.prestataireId ?? defaultPrestataireId ?? null)
  const [lieu,          setLieu]          = useState(atelier?.lieu ?? defaultLieu ?? '')
  const [notes,         setNotes]         = useState(atelier?.notes ?? '')

  // Edition : date + titre uniques
  const [date,       setDate]       = useState(toInputDate(atelier?.date))
  const [themeAutre, setThemeAutre] = useState(atelier?.themeAutre ?? '')

  // Création / edition-groupe : liste de nouvelles séances { date, themeAutre }
  const [seances, setSeances] = useState<Seance[]>([{ date: '', themeAutre: '' }])

  const [categories,   setCategories]   = useState<CategorieAvecThemes[]>([])
  const [prestataires, setPrestataires] = useState<PrestataireOption[]>([])
  const [suggestions,  setSuggestions]  = useState<string[]>([])
  const [erreur,       setErreur]       = useState('')
  const [enChargement, setEnChargement] = useState(false)

  // Charger catégories et prestataires au montage
  function chargerCategories() {
    fetch('/api/categories-ateliers')
      .then((r) => r.json())
      .then((data: CategorieAvecThemes[]) => setCategories(data))
      .catch(() => setCategories([]))
  }

  useEffect(() => {
    chargerCategories()
  }, [])

  function chargerPrestataires() {
    fetch('/api/prestataires')
      .then((r) => r.json())
      .then((data: PrestataireOption[]) => setPrestataires(data))
      .catch(() => setPrestataires([]))
  }

  useEffect(() => {
    chargerPrestataires()
  }, [])

  // Nom du thème sélectionné (pour label/placeholder dynamiques)
  const themeNom = (() => {
    if (!themeId) return ''
    for (const cat of categories) {
      const t = cat.themes.find((th) => th.id === themeId)
      if (t) return t.nom
    }
    return atelier?.themeNom ?? ''
  })()

  // Charger suggestions de titres quand le thème change
  useEffect(() => {
    if (!themeId) { setSuggestions([]); return }
    fetch(`/api/ateliers/titres?themeId=${themeId}`)
      .then((r) => r.json())
      .then((data: { titres?: string[] }) => setSuggestions(data.titres ?? []))
      .catch(() => setSuggestions([]))
  }, [themeId])

  function ajouterSeance() {
    setSeances((prev) => [...prev, { date: '', themeAutre: '' }])
  }

  function retirerSeance(index: number) {
    setSeances((prev) => prev.filter((_, i) => i !== index))
  }

  function modifierSeance(index: number, champ: keyof Seance, value: string) {
    setSeances((prev) => prev.map((s, i) => i === index ? { ...s, [champ]: value } : s))
  }

  async function soumettre() {
    setErreur('')
    setEnChargement(true)

    if (!themeId) {
      setErreur('Veuillez sélectionner un thème.')
      setEnChargement(false)
      return
    }

    try {
      if (mode === 'creation') {
        const seancesValides = seances.filter((s) => s.date.trim() !== '')
        if (seancesValides.length === 0) {
          setErreur('Au moins une date est requise.')
          return
        }

        const body = {
          themeId,
          prestataireId: prestataireId ?? undefined,
          lieu:          lieu          || undefined,
          seances:       seancesValides.map((s) => ({
            date:       s.date,
            themeAutre: s.themeAutre || undefined,
          })),
          notes: notes || undefined,
        }

        const res = await fetch('/api/ateliers', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })

        if (!res.ok) {
          const data = await res.json() as { erreur?: string }
          setErreur(data.erreur ?? 'Une erreur est survenue.')
          return
        }

        router.push(retourUrl ?? '/ateliers')
      } else if (mode === 'edition') {
        if (!date) { setErreur('La date est obligatoire.'); return }

        const body = {
          themeId,
          themeAutre:    themeAutre    || undefined,
          prestataireId: prestataireId,
          lieu:          lieu          || undefined,
          date,
          notes:         notes         || undefined,
        }

        const res = await fetch(`/api/ateliers/${atelier!.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })

        if (!res.ok) {
          const data = await res.json() as { erreur?: string }
          setErreur(data.erreur ?? 'Une erreur est survenue.')
          return
        }

        router.push(retourUrl ?? `/ateliers/${atelier!.id}`)
        router.refresh()
      } else {
        // edition-groupe : PATCH champs partagés sur toutes les séances existantes + POST nouvelles
        const ids = seancesExistantes?.map((s) => s.id) ?? []

        for (const seanceId of ids) {
          const body = {
            themeId,
            prestataireId: prestataireId,
            lieu:          lieu  || undefined,
            notes:         notes || undefined,
          }
          const res = await fetch(`/api/ateliers/${seanceId}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          })
          if (!res.ok) {
            const data = await res.json() as { erreur?: string }
            setErreur(data.erreur ?? 'Erreur lors de la mise à jour.')
            return
          }
        }

        // Créer les nouvelles séances
        const seancesValides = seances.filter((s) => s.date.trim() !== '')
        if (seancesValides.length > 0) {
          const body = {
            themeId,
            prestataireId: prestataireId ?? undefined,
            lieu:          lieu          || undefined,
            seances:       seancesValides.map((s) => ({
              date:       s.date,
              themeAutre: s.themeAutre || undefined,
            })),
            notes: notes || undefined,
          }
          const res = await fetch('/api/ateliers', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          })
          if (!res.ok) {
            const data = await res.json() as { erreur?: string }
            setErreur(data.erreur ?? 'Erreur lors de la création des nouvelles séances.')
            return
          }
        }

        router.push(retourUrl ?? `/ateliers/groupe/${ids[0] ?? atelier?.id}`)
        router.refresh()
      }
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">

      {/* Thème (groupé par catégorie) */}
      <Champ label="Thème" required>
        <div className="flex max-w-md items-center gap-1">
          <Select
            value={themeId ? String(themeId) : undefined}
            onValueChange={(v) => setThemeId(Number(v))}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Sélectionner un thème…" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat, ci) => (
                <SelectGroup key={cat.id}>
                  {ci > 0 && <div className="mx-1 my-1.5 h-px bg-border" />}
                  <SelectLabel className="px-2 py-1.5 text-sm font-semibold text-foreground uppercase tracking-wide">
                    {cat.nom}
                  </SelectLabel>
                  {cat.themes.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} className="pl-5">{t.nom}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <DialogueGererThemes categories={categories} onRefresh={chargerCategories} />
        </div>
      </Champ>

      {/* Séances selon le mode */}
      {mode === 'creation' ? (
        <SectionSeances
          seances={seances}
          onModifier={modifierSeance}
          onRetirer={retirerSeance}
          onAjouter={ajouterSeance}
          themeNom={themeNom}
          suggestions={suggestions}
          minUne
        />
      ) : mode === 'edition' ? (
        <>
          <Champ label="Date" required>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="max-w-[180px]"
            />
          </Champ>
          <Champ label={themeNom ? labelTitre(themeNom) : 'Titre de la séance'}>
            <InputTitre
              value={themeAutre}
              onChange={setThemeAutre}
              suggestions={suggestions}
              placeholder={themeNom ? placeholderTitre(themeNom) : 'Optionnel…'}
              className="max-w-sm"
            />
          </Champ>
        </>
      ) : (
        <>
          {/* Séances existantes (lecture seule) */}
          {seancesExistantes && seancesExistantes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Séances existantes</p>
              <div className="rounded-md border divide-y text-sm">
                {seancesExistantes.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2">
                    <span>
                      {formaterDateISO(new Date(s.date))}
                      {s.themeAutre && <span className="ml-2 text-muted-foreground">{s.themeAutre}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Nouvelles séances */}
          <SectionSeances
            seances={seances}
            onModifier={modifierSeance}
            onRetirer={retirerSeance}
            onAjouter={ajouterSeance}
            themeNom={themeNom}
            suggestions={suggestions}
            titre="Ajouter des séances"
          />
        </>
      )}

      {/* Lieu */}
      <Champ label="Lieu">
        <Input
          value={lieu}
          onChange={(e) => setLieu(e.target.value)}
          placeholder="Ex : L'Escale, Café culturel 109…"
          maxLength={200}
          className="max-w-sm"
        />
      </Champ>

      {/* Prestataire (Select + gestion) */}
      <Champ label="Prestataire">
        <div className="flex max-w-sm items-center gap-1">
          <Select
            value={prestataireId ? String(prestataireId) : 'aucun'}
            onValueChange={(v) => setPrestataireId(v === 'aucun' ? null : Number(v))}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Aucun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aucun">Aucun</SelectItem>
              {prestataires.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogueGererPrestataires prestataires={prestataires} onRefresh={chargerPrestataires} />
        </div>
      </Champ>

      {/* Notes */}
      <Champ label="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Informations complémentaires…"
          className="max-w-sm"
        />
      </Champ>

      {erreur && <p className="text-sm text-destructive">{erreur}</p>}

      <div className="flex gap-3 pt-2">
        <Button onClick={soumettre} disabled={enChargement}>
          {enChargement ? 'Enregistrement…' : mode === 'creation' ? 'Créer les séances' : mode === 'edition-groupe' ? 'Enregistrer l\u2019atelier' : 'Enregistrer'}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={enChargement}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
