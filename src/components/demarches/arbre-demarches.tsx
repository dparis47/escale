'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
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

type CategorieThemes = { nom: string; themes: string[] }

/** Première lettre en majuscule */
function majuscule(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ThemeAteliersDynamiques({
  champs,
  onChange,
  disabled,
  categoriesAteliers,
}: {
  champs:              DemarcheChamps
  onChange:            (c: DemarcheChamps) => void
  disabled?:           boolean
  categoriesAteliers:  CategorieThemes[]
}) {
  const valeur = champs.atelierNoms[0] ?? ''

  function choisir(nom: string) {
    if (nom === '__aucun__') {
      onChange({ ...champs, atelierNoms: [], atelierParticipation: false })
    } else {
      onChange({ ...champs, atelierNoms: [nom], atelierParticipation: true })
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-0.5">
        ATELIERS DE REDYNAMISATION
      </p>

      <Select
        value={valeur || '__aucun__'}
        onValueChange={choisir}
        disabled={disabled}
      >
        <SelectTrigger className="max-w-md">
          <SelectValue placeholder="Aucun atelier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__aucun__">Aucun atelier</SelectItem>
          {categoriesAteliers.map((cat, ci) => (
            <SelectGroup key={cat.nom}>
              {ci > 0 && <div className="mx-1 my-1.5 h-px bg-border" />}
              <SelectLabel className="px-2 py-1.5 text-sm font-semibold text-foreground uppercase tracking-wide">
                {majuscule(cat.nom)}
              </SelectLabel>
              {cat.themes.map((nom) => (
                <SelectItem key={nom} value={nom} className="pl-5">
                  {majuscule(nom)}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
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
  const [categoriesAteliers, setCategoriesAteliers] = useState<CategorieThemes[]>([])

  useEffect(() => {
    fetch('/api/ateliers/noms-demarches')
      .then((r) => r.json())
      .then((d: { categories?: CategorieThemes[] }) => setCategoriesAteliers(d.categories ?? []))
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
        categoriesAteliers={categoriesAteliers}
      />
    </div>
  )
}

// Export de DEMARCHE_VIDE pour l'utilisation dans les formulaires
export { DEMARCHE_VIDE }
