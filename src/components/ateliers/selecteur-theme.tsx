'use client'

import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COULEURS_CATEGORIE, COULEURS_DISPONIBLES } from '@/schemas/atelier'
import type { CategorieAvecThemes } from '@/schemas/atelier'

interface Props {
  categories: CategorieAvecThemes[]
  value:      number | null
  onChange:   (id: number | null) => void
  onRefresh:  () => void
}

interface EtatCreation {
  categorieId:              number | null   // null = nouvelle catégorie
  nouvelleCategorie:        boolean
  nouvelleCategorieNom:     string
  nouvelleCategorieCouleur: string
  nomTheme:                 string
}

function nomThemeSelectionne(categories: CategorieAvecThemes[], value: number | null): string {
  if (!value) return ''
  for (const cat of categories) {
    const t = cat.themes.find((th) => th.id === value)
    if (t) return t.nom
  }
  return ''
}

export function SelecteurTheme({ categories, value, onChange, onRefresh }: Props) {
  const [recherche,    setRecherche]    = useState('')
  const [ouvert,       setOuvert]       = useState(false)
  const [creation,     setCreation]     = useState<EtatCreation | null>(null)
  const [enChargement, setEnChargement] = useState(false)
  const [erreur,       setErreur]       = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const nomSelectionne = nomThemeSelectionne(categories, value)
  const valeurInput    = ouvert ? recherche : nomSelectionne

  const terme = recherche.toLowerCase().trim()
  const themesFiltres = categories
    .map((cat) => ({
      ...cat,
      themes: cat.themes.filter((t) => terme === '' || t.nom.toLowerCase().includes(terme)),
    }))
    .filter((cat) => cat.themes.length > 0)
  const tousLesThemes = categories.flatMap((c) => c.themes)
  const matchExact    = tousLesThemes.some((t) => t.nom.toLowerCase() === terme)

  function ouvrirDropdown() {
    setRecherche('')
    setOuvert(true)
  }

  function fermerDropdown() {
    setTimeout(() => {
      setOuvert(false)
      setRecherche('')
      setCreation(null)
      setErreur('')
    }, 150)
  }

  function selectionner(id: number) {
    onChange(id)
    setOuvert(false)
    setRecherche('')
    setCreation(null)
  }

  function ouvrirCreation(nomPreRempli = '') {
    setOuvert(true)
    setCreation({
      categorieId:              categories.length > 0 ? categories[0].id : null,
      nouvelleCategorie:        false,
      nouvelleCategorieNom:     '',
      nouvelleCategorieCouleur: 'gray',
      nomTheme:                 nomPreRempli,
    })
  }

  async function creer() {
    if (!creation) return
    const nom = creation.nomTheme.trim()
    if (!nom) { setErreur('Le nom du thème est requis.'); return }
    if (creation.nouvelleCategorie) {
      if (!creation.nouvelleCategorieNom.trim()) { setErreur('Le nom de la catégorie est requis.'); return }
    } else {
      if (!creation.categorieId) { setErreur('Sélectionner une catégorie.'); return }
    }
    setErreur('')
    setEnChargement(true)

    try {
      let themeIdCree: number | null = null

      if (creation.nouvelleCategorie) {
        const res = await fetch('/api/categories-ateliers', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            nom:    creation.nouvelleCategorieNom.trim(),
            couleur: creation.nouvelleCategorieCouleur,
            themes: [nom],
          }),
        })
        if (!res.ok) {
          const data = await res.json() as { erreur?: string }
          setErreur(data.erreur ?? 'Erreur lors de la création.')
          return
        }
        await onRefresh()
        const res2 = await fetch('/api/categories-ateliers')
        const cats: CategorieAvecThemes[] = await res2.json()
        for (const cat of cats) {
          const t = cat.themes.find((th) => th.nom === nom && cat.nom === creation.nouvelleCategorieNom.trim())
          if (t) { themeIdCree = t.id; break }
        }
      } else {
        const res = await fetch(`/api/categories-ateliers/${creation.categorieId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ themesAjoutes: [nom] }),
        })
        if (!res.ok) {
          const data = await res.json() as { erreur?: string }
          setErreur(data.erreur ?? 'Erreur lors de la création.')
          return
        }
        await onRefresh()
        const res2 = await fetch('/api/categories-ateliers')
        const cats: CategorieAvecThemes[] = await res2.json()
        for (const cat of cats) {
          if (cat.id !== creation.categorieId) continue
          const t = cat.themes.find((th) => th.nom === nom)
          if (t) { themeIdCree = t.id; break }
        }
      }

      if (themeIdCree) onChange(themeIdCree)
      setOuvert(false)
      setRecherche('')
      setCreation(null)
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <div className="flex max-w-md items-center gap-1">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={valeurInput}
          onChange={(e) => { setRecherche(e.target.value); if (value) onChange(null) }}
          onFocus={ouvrirDropdown}
          onBlur={fermerDropdown}
          placeholder="Chercher un thème…"
          autoComplete="off"
        />

        {ouvert && (
          <div className="absolute z-50 mt-1 min-w-[360px] rounded-md border bg-white shadow-md">

            {/* Formulaire de création */}
            {creation ? (
              <div className="space-y-3 p-3">

                {/* Catégorie */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Catégorie</Label>
                  {!creation.nouvelleCategorie ? (
                    <div className="space-y-1.5">
                      <Select
                        value={String(creation.categorieId ?? '')}
                        onValueChange={(v) => setCreation((c) => c && { ...c, categorieId: Number(v) })}
                      >
                        <SelectTrigger className="h-8 w-full text-sm">
                          <SelectValue placeholder="Choisir…" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setCreation((c) => c && { ...c, nouvelleCategorie: true, categorieId: null })}
                      >
                        + Nouvelle catégorie…
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        <Input
                          value={creation.nouvelleCategorieNom}
                          onChange={(e) => setCreation((c) => c && { ...c, nouvelleCategorieNom: e.target.value })}
                          placeholder="Nom de la catégorie"
                          maxLength={100}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs text-muted-foreground"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setCreation((c) => c && {
                            ...c,
                            nouvelleCategorie: false,
                            nouvelleCategorieNom: '',
                            categorieId: categories.length > 0 ? categories[0].id : null,
                          })}
                        >
                          Annuler
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {COULEURS_DISPONIBLES.map((c) => {
                          const cls = COULEURS_CATEGORIE[c]
                          return (
                            <button
                              key={c}
                              type="button"
                              title={c}
                              className={`h-6 w-6 rounded-full border-2 ${cls.bg} ${creation.nouvelleCategorieCouleur === c ? 'border-foreground' : 'border-transparent'}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setCreation((prev) => prev && { ...prev, nouvelleCategorieCouleur: c })}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Nom du thème */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Nouveau thème</Label>
                  <Input
                    value={creation.nomTheme}
                    onChange={(e) => setCreation((c) => c && { ...c, nomTheme: e.target.value })}
                    placeholder="Ex : Ateliers CV"
                    maxLength={100}
                    autoFocus={!creation.nouvelleCategorie}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void creer() } }}
                  />
                </div>

                {erreur && <p className="text-xs text-destructive">{erreur}</p>}

                <div className="flex gap-2">
                  <Button
                    type="button" size="sm"
                    onClick={creer}
                    disabled={enChargement}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {enChargement ? 'Création…' : 'Créer'}
                  </Button>
                  <Button
                    type="button" size="sm" variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setCreation(null)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>

            ) : (
              /* Liste de recherche */
              <>
                <div className="max-h-60 overflow-y-auto py-1">
                  {themesFiltres.length === 0 && terme !== '' ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Aucun thème trouvé.</p>
                  ) : (
                    themesFiltres.map((cat, ci) => (
                      <div key={cat.id}>
                        {ci > 0 && <div className="mx-2 my-1 h-px bg-border" />}
                        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {cat.nom}
                        </p>
                        {cat.themes.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${value === t.id ? 'bg-accent font-medium' : ''}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectionner(t.id)}
                          >
                            {t.nom}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>

                {terme !== '' && !matchExact && (
                  <>
                    <div className="mx-2 my-1 h-px bg-border" />
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => ouvrirCreation(recherche.trim())}
                    >
                      + Créer le thème &laquo;&nbsp;{recherche.trim()}&nbsp;&raquo;
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bouton "+" toujours visible */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        title="Nouveau thème"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => ouvrirCreation()}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
