'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ARBRE_DEMARCHES,
  DEMARCHE_VIDE,
  videChampsDemarche,
  sectionsOuvertesInitiales,
  collectSectionIds,
  type DemarcheChamps,
  type NoeudFeuille,
  type NoeudTexte,
  type NoeudSection,
  type NoeudTheme,
  type Noeud,
} from '@/lib/demarches'

interface Props {
  champs:   DemarcheChamps
  onChange: (champs: DemarcheChamps) => void
  disabled?: boolean
}

// ─── Thème ateliers dynamique ─────────────────────────────────────────────────

function ThemeAteliersDynamiques({
  champs,
  onChange,
  disabled,
  ateliersSuggeres,
}: {
  champs:            DemarcheChamps
  onChange:          (c: DemarcheChamps) => void
  disabled?:         boolean
  ateliersSuggeres:  string[]
}) {
  const [texteLibre, setTexteLibre] = useState('')

  function toggleAtelier(nom: string) {
    const actuel  = champs.atelierNoms
    const suivant = actuel.includes(nom)
      ? actuel.filter((a) => a !== nom)
      : [...actuel, nom]
    onChange({ ...champs, atelierNoms: suivant, atelierParticipation: suivant.length > 0 })
  }

  function ajouterLibre() {
    const v = texteLibre.trim()
    if (!v || champs.atelierNoms.includes(v)) return
    const suivant = [...champs.atelierNoms, v]
    onChange({ ...champs, atelierNoms: suivant, atelierParticipation: suivant.length > 0 })
    setTexteLibre('')
  }

  // Ateliers saisis librement (pas dans la liste suggérée)
  const ateliersLibres = champs.atelierNoms.filter((a) => !ateliersSuggeres.includes(a))

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-0.5">
        ATELIERS DE REDYNAMISATION
      </p>
      <div className="space-y-2">
        {/* Cases à cocher pour chaque atelier de la liste */}
        {ateliersSuggeres.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            {ateliersSuggeres.map((nom) => (
              <div key={nom} className="flex items-center gap-2">
                <Checkbox
                  id={`atelier-${nom}`}
                  checked={champs.atelierNoms.includes(nom)}
                  onCheckedChange={() => toggleAtelier(nom)}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`atelier-${nom}`}
                  className={`cursor-pointer font-normal text-sm ${disabled ? 'opacity-50' : ''}`}
                >
                  {nom}
                </Label>
              </div>
            ))}
          </div>
        )}

        {/* Ateliers saisis librement */}
        {ateliersLibres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ateliersLibres.map((nom) => (
              <span
                key={nom}
                className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2 py-0.5 text-xs"
              >
                {nom}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleAtelier(nom)}
                    className="text-muted-foreground hover:text-destructive leading-none"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Saisie libre */}
        {!disabled && (
          <div className="flex gap-1">
            <Input
              value={texteLibre}
              onChange={(e) => setTexteLibre(e.target.value)}
              className="h-7 flex-1 text-sm"
              placeholder="Atelier non listé…"
              maxLength={200}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); ajouterLibre() }
              }}
            />
            <button
              type="button"
              onClick={ajouterLibre}
              disabled={!texteLibre.trim()}
              className="rounded border border-input px-2 text-xs hover:bg-muted disabled:opacity-50"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Rendu d'une feuille ──────────────────────────────────────────────────────

function Feuille({
  noeud,
  champs,
  onChange,
  disabled,
}: {
  noeud:    NoeudFeuille
  champs:   DemarcheChamps
  onChange: (c: DemarcheChamps) => void
  disabled?: boolean
}) {
  const checked = champs[noeud.champ] === true

  function toggle() {
    let next = { ...champs, [noeud.champ]: !checked }
    if (checked) {
      if (noeud.champNombre)  next = { ...next, [noeud.champNombre]:  null }
      if (noeud.champTexte)   next = { ...next, [noeud.champTexte]:   null }
      if (noeud.champTableau) next = { ...next, [noeud.champTableau]: [] }
    }
    onChange(next)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`d-${noeud.champ}`}
          checked={checked}
          onCheckedChange={toggle}
          disabled={disabled}
        />
        <Label
          htmlFor={`d-${noeud.champ}`}
          className={`cursor-pointer font-normal text-sm ${disabled ? 'opacity-50' : ''}`}
        >
          {noeud.label}
        </Label>
      </div>

      {/* Champ nombre lié (si case cochée) */}
      {checked && noeud.champNombre && (
        <div className="ml-6 flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={champs[noeud.champNombre] ?? ''}
            onChange={(e) =>
              onChange({
                ...champs,
                [noeud.champNombre!]: e.target.value === '' ? null : parseInt(e.target.value, 10),
              })
            }
            disabled={disabled}
            className="h-7 w-24 text-sm"
            placeholder="Nombre"
          />
          <span className="text-xs text-muted-foreground">offres</span>
        </div>
      )}

      {/* Champ texte lié (si case cochée) */}
      {checked && noeud.champTexte && (
        <div className="ml-6">
          <Input
            value={champs[noeud.champTexte] ?? ''}
            onChange={(e) =>
              onChange({ ...champs, [noeud.champTexte!]: e.target.value || null })
            }
            disabled={disabled}
            className="h-7 text-sm"
            maxLength={200}
            placeholder={noeud.label}
          />
        </div>
      )}
    </div>
  )
}

// ─── Rendu d'un nœud texte autonome ──────────────────────────────────────────

function NoeudTexteUI({
  noeud,
  champs,
  onChange,
  disabled,
}: {
  noeud:    NoeudTexte
  champs:   DemarcheChamps
  onChange: (c: DemarcheChamps) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className={`text-sm font-normal ${disabled ? 'opacity-50' : ''}`}>{noeud.label}</Label>
      <Input
        value={champs[noeud.champ] ?? ''}
        onChange={(e) => onChange({ ...champs, [noeud.champ]: e.target.value || null })}
        disabled={disabled}
        className="h-7 text-sm"
        maxLength={500}
        placeholder={noeud.label}
      />
    </div>
  )
}

// ─── Rendu d'une section repliable ───────────────────────────────────────────

function Section({
  noeud,
  champs,
  onChange,
  sectionsOuvertes,
  setSectionsOuvertes,
  disabled,
  parentCoche,
}: {
  noeud:               NoeudSection
  champs:              DemarcheChamps
  onChange:            (c: DemarcheChamps) => void
  sectionsOuvertes:    Set<string>
  setSectionsOuvertes: React.Dispatch<React.SetStateAction<Set<string>>>
  disabled?:           boolean
  parentCoche?:        boolean
}) {
  if (!noeud.label) {
    if (!parentCoche) return null
    return (
      <div className="ml-6 space-y-1.5 border-l-2 border-muted pl-3">
        {noeud.enfants.map((enfant, i) => (
          <RendreNoeud
            key={i}
            noeud={enfant}
            champs={champs}
            onChange={onChange}
            sectionsOuvertes={sectionsOuvertes}
            setSectionsOuvertes={setSectionsOuvertes}
            disabled={disabled}
          />
        ))}
      </div>
    )
  }

  const ouvert = sectionsOuvertes.has(noeud.id)

  function basculer() {
    setSectionsOuvertes((prev) => {
      const next = new Set(prev)
      if (ouvert) {
        const apres = videChampsDemarche(champs, noeud)
        onChange(apres)
        for (const id of collectSectionIds(noeud)) next.delete(id)
      } else {
        next.add(noeud.id)
      }
      return next
    })
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`section-${noeud.id}`}
          checked={ouvert}
          onCheckedChange={basculer}
          disabled={disabled}
        />
        <Label
          htmlFor={`section-${noeud.id}`}
          className={`cursor-pointer text-sm font-medium ${disabled ? 'opacity-50' : ''}`}
        >
          {noeud.label}
        </Label>
      </div>

      {ouvert && (
        <div className="ml-3 space-y-1.5 border-l-2 border-muted pl-3">
          {noeud.enfants.map((enfant, i) => (
            <RendreNoeud
              key={i}
              noeud={enfant}
              champs={champs}
              onChange={onChange}
              sectionsOuvertes={sectionsOuvertes}
              setSectionsOuvertes={setSectionsOuvertes}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Dispatch générique ───────────────────────────────────────────────────────

function RendreNoeud({
  noeud,
  champs,
  onChange,
  sectionsOuvertes,
  setSectionsOuvertes,
  disabled,
  parentCoche,
}: {
  noeud:               Noeud
  champs:              DemarcheChamps
  onChange:            (c: DemarcheChamps) => void
  sectionsOuvertes:    Set<string>
  setSectionsOuvertes: React.Dispatch<React.SetStateAction<Set<string>>>
  disabled?:           boolean
  parentCoche?:        boolean
}) {
  if (noeud.type === 'feuille') {
    return <Feuille noeud={noeud} champs={champs} onChange={onChange} disabled={disabled} />
  }
  if (noeud.type === 'texte') {
    return <NoeudTexteUI noeud={noeud} champs={champs} onChange={onChange} disabled={disabled} />
  }
  return (
    <Section
      noeud={noeud}
      champs={champs}
      onChange={onChange}
      sectionsOuvertes={sectionsOuvertes}
      setSectionsOuvertes={setSectionsOuvertes}
      disabled={disabled}
      parentCoche={parentCoche}
    />
  )
}

// ─── Thème standard (niveau 0) ────────────────────────────────────────────────

function Theme({
  theme,
  champs,
  onChange,
  sectionsOuvertes,
  setSectionsOuvertes,
  disabled,
}: {
  theme:               NoeudTheme
  champs:              DemarcheChamps
  onChange:            (c: DemarcheChamps) => void
  sectionsOuvertes:    Set<string>
  setSectionsOuvertes: React.Dispatch<React.SetStateAction<Set<string>>>
  disabled?:           boolean
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-0.5">
        {theme.label}
      </p>
      <div className="space-y-1.5">
        {theme.enfants.map((enfant, i) => {
          const prev = i > 0 ? theme.enfants[i - 1] : null
          const parentCoche =
            prev?.type === 'feuille' ? champs[prev.champ] === true : undefined

          return (
            <RendreNoeud
              key={i}
              noeud={enfant}
              champs={champs}
              onChange={onChange}
              sectionsOuvertes={sectionsOuvertes}
              setSectionsOuvertes={setSectionsOuvertes}
              disabled={disabled}
              parentCoche={parentCoche}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ArbreDemarches({ champs, onChange, disabled }: Props) {
  const [sectionsOuvertes, setSectionsOuvertes] = useState<Set<string>>(
    () => sectionsOuvertesInitiales(champs),
  )
  const [ateliersSuggeres, setAteliersSuggeres] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/ateliers/noms-demarches')
      .then((r) => r.json())
      .then((d: { noms?: string[] }) => setAteliersSuggeres(d.noms ?? []))
      .catch(() => {})
  }, [])

  // Thèmes standards (tout sauf "ateliers" qui a son propre rendu)
  const themesSansAteliers = ARBRE_DEMARCHES.filter((t) => t.id !== 'ateliers')

  return (
    <div className="space-y-4">
      {themesSansAteliers.map((theme) => (
        <Theme
          key={theme.id}
          theme={theme}
          champs={champs}
          onChange={onChange}
          sectionsOuvertes={sectionsOuvertes}
          setSectionsOuvertes={setSectionsOuvertes}
          disabled={disabled}
        />
      ))}

      {/* Thème ateliers avec cases à cocher dynamiques */}
      <ThemeAteliersDynamiques
        champs={champs}
        onChange={onChange}
        disabled={disabled}
        ateliersSuggeres={ateliersSuggeres}
      />
    </div>
  )
}

// Export de DEMARCHE_VIDE pour l'utilisation dans les formulaires
export { DEMARCHE_VIDE }
