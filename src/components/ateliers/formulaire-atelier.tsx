'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formaterDateISO } from '@/lib/dates'
import { THEMES_ATELIER_FR, THEMES_ATELIER_VALUES } from '@/schemas/atelier'
import type { ThemeAtelier } from '@prisma/client'

type Mode = 'creation' | 'edition'

interface AtelierData {
  id:          number
  theme:       ThemeAtelier
  themeAutre:  string | null
  prestataire: string | null
  lieu:        string | null
  date:        Date
  notes:       string | null
}

interface Props {
  mode:     Mode
  atelier?: AtelierData
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

function labelTitre(theme: ThemeAtelier): string {
  if (theme === 'CINEMA' || theme === 'PROJET_CINEMA') return 'Titre du film'
  if (theme === 'AUTRE') return 'Précisez le thème'
  return 'Titre de la séance'
}

function placeholderTitre(theme: ThemeAtelier): string {
  if (theme === 'CINEMA' || theme === 'PROJET_CINEMA') return 'Ex : Les Misérables'
  if (theme === 'AUTRE') return 'Ex : Jardin collectif'
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

export function FormulaireAtelier({ mode, atelier }: Props) {
  const router = useRouter()

  const [theme,       setTheme]       = useState<ThemeAtelier>(atelier?.theme ?? 'COURS_INFORMATIQUE')
  const [prestataire, setPrestataire] = useState(atelier?.prestataire ?? '')
  const [lieu,        setLieu]        = useState(atelier?.lieu        ?? '')
  const [notes,       setNotes]       = useState(atelier?.notes       ?? '')

  // Edition : date + titre uniques
  const [date,       setDate]       = useState(toInputDate(atelier?.date))
  const [themeAutre, setThemeAutre] = useState(atelier?.themeAutre ?? '')

  // Création : liste de séances { date, themeAutre }
  const [seances, setSeances] = useState<Seance[]>([{ date: '', themeAutre: '' }])

  const [suggestions,  setSuggestions]  = useState<string[]>([])
  const [erreur,       setErreur]       = useState('')
  const [enChargement, setEnChargement] = useState(false)

  useEffect(() => {
    fetch(`/api/ateliers/titres?theme=${theme}`)
      .then((r) => r.json())
      .then((data: { titres?: string[] }) => setSuggestions(data.titres ?? []))
      .catch(() => setSuggestions([]))
  }, [theme])

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

    try {
      if (mode === 'creation') {
        const seancesValides = seances.filter((s) => s.date.trim() !== '')
        if (seancesValides.length === 0) {
          setErreur('Au moins une date est requise.')
          return
        }

        const body = {
          theme,
          prestataire: prestataire || undefined,
          lieu:        lieu        || undefined,
          seances:     seancesValides.map((s) => ({
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

        router.push('/ateliers')
      } else {
        if (!date) { setErreur('La date est obligatoire.'); return }

        const body = {
          theme,
          themeAutre:  themeAutre  || undefined,
          prestataire: prestataire || undefined,
          lieu:        lieu        || undefined,
          date,
          notes:       notes       || undefined,
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

        router.push(`/ateliers/${atelier!.id}`)
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

      {/* Thème */}
      <Champ label="Thème" required>
        <Select
          value={theme}
          onValueChange={(v) => setTheme(v as ThemeAtelier)}
        >
          <SelectTrigger className="max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEMES_ATELIER_VALUES.map((t) => (
              <SelectItem key={t} value={t}>{THEMES_ATELIER_FR[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Champ>

      {/* Séances (création) ou date + titre (édition) */}
      {mode === 'creation' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[180px_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
            <span>Date <span className="text-destructive">*</span></span>
            <span>{labelTitre(theme)}</span>
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
                onChange={(e) => modifierSeance(i, 'date', e.target.value)}
              />
              <InputTitre
                value={s.themeAutre}
                onChange={(v) => modifierSeance(i, 'themeAutre', v)}
                suggestions={suggestionsEffectives}
                placeholder={placeholderTitre(theme)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => retirerSeance(i)}
                disabled={seances.length === 1}
              >
                ✕
              </Button>
            </div>
          )})}
          <Button type="button" variant="outline" size="sm" onClick={ajouterSeance}>
            + Ajouter une séance
          </Button>
        </div>
      ) : (
        <>
          <Champ label="Date" required>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="max-w-[180px]"
            />
          </Champ>
          <Champ label={labelTitre(theme)}>
            <InputTitre
              value={themeAutre}
              onChange={setThemeAutre}
              suggestions={suggestions}
              placeholder={placeholderTitre(theme)}
              className="max-w-sm"
            />
          </Champ>
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

      {/* Prestataire */}
      <Champ label="Prestataire">
        <Input
          value={prestataire}
          onChange={(e) => setPrestataire(e.target.value)}
          placeholder="Ex : La cuisine d'Hélo, Au fil des Sesounes…"
          maxLength={200}
          className="max-w-sm"
        />
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
          {enChargement ? 'Enregistrement…' : mode === 'creation' ? 'Créer les séances' : 'Enregistrer'}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={enChargement}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
