'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ── Types ────────────────────────────────────────────────────────────────────

interface ThemeDetecte {
  brut:        string
  occurrences: number
}

interface ResultatImport {
  total:             number
  valides:           number
  personnesMatchees: number
  personnesACreer:   number
  doublons:          number
  asidBrouillons:    number
  erreurs:           { ligne: number; message: string }[]
  apercu?: {
    ligne:   number
    date:    string
    nom:     string
    prenom:  string
    genre:   string | null
    asid:    boolean
  }[]
  themesDetectes?: ThemeDetecte[]
  nomsInvalides?:  { cle: string; nom: string; prenom: string; lignes: number[]; nomInvalide: boolean; prenomInvalide: boolean }[]
  correspondancesSimilaires?: { excelNom: string; excelPrenom: string; baseNom: string; basePrenom: string; lignes: number[] }[]
  doublonsSuspectes?: { variantes: { cle: string; nom: string; prenom: string; lignes: number[] }[] }[]
}

interface CategorieAvecThemes {
  id:     number
  nom:    string
  themes: { id: number; nom: string }[]
}

type Etape = 'selection' | 'preview' | 'resultat'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise pour comparaison fuzzy : minuscule, sans accents, sans espaces multiples */
function normaliserFuzzy(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

/** Tente de trouver le meilleur thème existant qui match le texte brut */
function trouverMeilleurMatch(
  brut: string,
  categories: CategorieAvecThemes[],
): number | null {
  const norm = normaliserFuzzy(brut)
  // Match exact (insensible casse/accents)
  for (const cat of categories) {
    for (const theme of cat.themes) {
      if (normaliserFuzzy(theme.nom) === norm) return theme.id
    }
  }
  // Match par inclusion (le brut est contenu dans le nom du thème ou inversement)
  for (const cat of categories) {
    for (const theme of cat.themes) {
      const normTheme = normaliserFuzzy(theme.nom)
      if (normTheme.includes(norm) || norm.includes(normTheme)) return theme.id
    }
  }
  return null
}

// ── Composant ────────────────────────────────────────────────────────────────

export function FormulaireImportVisites() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [etape, setEtape]               = useState<Etape>('selection')
  const [fichier, setFichier]           = useState<File | null>(null)
  const [preview, setPreview]           = useState<ResultatImport | null>(null)
  const [resultat, setResultat]         = useState<ResultatImport | null>(null)
  const [loading, setLoading]           = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null)

  // Mapping thèmes
  const [categories, setCategories]     = useState<CategorieAvecThemes[]>([])
  const [mappingThemes, setMappingThemes] = useState<Record<string, string>>({})
  // Corrections de genre : numéro de ligne → 'HOMME' | 'FEMME'
  const [correctionsGenre, setCorrectionsGenre] = useState<Record<string, string>>({})
  // Corrections de noms : "NOM||prenom" → { nom, prenom }
  const [correctionsNoms, setCorrectionsNoms] = useState<Record<string, { nom: string; prenom: string }>>({})
  // Correspondances similaires acceptées (Excel → Base)
  const [accepterCorrespondances, setAccepterCorrespondances] = useState<Record<string, boolean>>({})
  // Doublons Excel↔Excel : index groupe → clé choisie
  const [choixDoublons, setChoixDoublons] = useState<Record<number, string>>({})
  // string car Select utilise des strings : "id" ou "__ignorer__"

  // Charger les catégories/thèmes au mount
  useEffect(() => {
    fetch('/api/categories-ateliers')
      .then((r) => r.json())
      .then((data: CategorieAvecThemes[]) => setCategories(data))
      .catch(() => {})
  }, [])

  function onFichierChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFichier(f)
    setPreview(null)
    setResultat(null)
    setEtape('selection')
    setErreurGlobale(null)
    setMappingThemes({})
    setCorrectionsGenre({})
    setCorrectionsNoms({})
    setAccepterCorrespondances({})
    setChoixDoublons({})
  }

  async function analyser() {
    if (!fichier) return
    setLoading(true)
    setErreurGlobale(null)
    try {
      const fd = new FormData()
      fd.append('fichier', fichier)
      const res  = await fetch('/api/import/visites?dry_run=true', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { erreur?: string } | null
        setErreurGlobale(body?.erreur ?? `Erreur lors de l'analyse (${res.status}).`)
        return
      }
      const data = await res.json() as ResultatImport
      setPreview(data)

      // Pré-remplir le mapping par match fuzzy
      if (data.themesDetectes && data.themesDetectes.length > 0) {
        const initial: Record<string, string> = {}
        for (const td of data.themesDetectes) {
          const match = trouverMeilleurMatch(td.brut, categories)
          initial[td.brut] = match ? String(match) : '__ignorer__'
        }
        setMappingThemes(initial)
      }

      // Pré-sélectionner les correspondances similaires (toutes acceptées par défaut)
      if (data.correspondancesSimilaires && data.correspondancesSimilaires.length > 0) {
        const initCorr: Record<string, boolean> = {}
        for (const c of data.correspondancesSimilaires) {
          initCorr[`${c.excelNom}||${c.excelPrenom}`] = true
        }
        setAccepterCorrespondances(initCorr)
      }

      // Pré-sélectionner les doublons Excel (variante avec le plus de lignes)
      if (data.doublonsSuspectes && data.doublonsSuspectes.length > 0) {
        const initDoub: Record<number, string> = {}
        for (let i = 0; i < data.doublonsSuspectes.length; i++) {
          const groupe = data.doublonsSuspectes[i]
          const best = groupe.variantes.reduce((a, b) => a.lignes.length >= b.lignes.length ? a : b)
          initDoub[i] = best.cle
        }
        setChoixDoublons(initDoub)
      }

      setEtape('preview')
    } catch (err) {
      setErreurGlobale(`Erreur lors de l'analyse : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  async function importer() {
    if (!fichier) return
    setLoading(true)
    setErreurGlobale(null)
    try {
      const fd = new FormData()
      fd.append('fichier', fichier)

      // Construire le mapping numérique pour l'API
      const mapping: Record<string, number | null> = {}
      for (const [brut, val] of Object.entries(mappingThemes)) {
        mapping[brut] = val === '__ignorer__' ? null : Number(val)
      }

      // Passer les corrections dans le FormData (évite les limites d'URL)
      if (Object.keys(mapping).length > 0) {
        fd.append('mappingThemes', JSON.stringify(mapping))
      }
      if (Object.keys(correctionsGenre).length > 0) {
        fd.append('correctionsGenre', JSON.stringify(correctionsGenre))
      }
      // Fusionner les corrections manuelles + correspondances similaires + doublons
      const mergedNoms: Record<string, { nom: string; prenom: string }> = { ...correctionsNoms }

      // Section A : correspondances acceptées → corriger le nom Excel vers le nom en base
      for (const c of correspondancesSimilaires) {
        const cle = `${c.excelNom}||${c.excelPrenom}`
        if (accepterCorrespondances[cle] !== false) {
          mergedNoms[cle] = { nom: c.baseNom, prenom: c.basePrenom }
        }
      }

      // Section B : doublons → corriger les variantes non choisies vers la variante choisie
      for (let i = 0; i < doublonsSuspectes.length; i++) {
        const groupe = doublonsSuspectes[i]
        const chosenCle = choixDoublons[i]
        if (!chosenCle || chosenCle === '__pas_doublon__') continue
        const chosen = groupe.variantes.find((v) => v.cle === chosenCle)
        if (!chosen) continue
        for (const v of groupe.variantes) {
          if (v.cle !== chosenCle) {
            mergedNoms[v.cle] = { nom: chosen.nom, prenom: chosen.prenom }
          }
        }
      }

      if (Object.keys(mergedNoms).length > 0) {
        fd.append('correctionsNoms', JSON.stringify(mergedNoms))
      }

      const res = await fetch('/api/import/visites', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { erreur?: string } | null
        setErreurGlobale(body?.erreur ?? `Erreur lors de l'import (${res.status}).`)
        return
      }
      const data = await res.json() as ResultatImport
      setResultat(data)
      setEtape('resultat')
    } catch (err) {
      setErreurGlobale(`Erreur lors de l'import : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  function recommencer() {
    setFichier(null)
    setPreview(null)
    setResultat(null)
    setEtape('selection')
    setErreurGlobale(null)
    setMappingThemes({})
    setCorrectionsGenre({})
    setCorrectionsNoms({})
    setAccepterCorrespondances({})
    setChoixDoublons({})
    if (inputRef.current) inputRef.current.value = ''
  }

  const themesDetectes = preview?.themesDetectes ?? []
  const aDesThemes = themesDetectes.length > 0
  const apercu = preview?.apercu ?? []
  const lignesSansGenre = apercu.filter((r) => !r.genre)
  const lignesAvecGenre = apercu.filter((r) => r.genre).slice(0, 5)
  const nomsInvalides = preview?.nomsInvalides ?? []
  const correspondancesSimilaires = preview?.correspondancesSimilaires ?? []
  const doublonsSuspectes = preview?.doublonsSuspectes ?? []

  return (
    <div className="space-y-6">
      {/* ── Sélection du fichier ── */}
      <div className="rounded-md border p-4">
        <label className="mb-2 block text-sm font-medium">Fichier Excel (.xlsx, .xls)</label>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onFichierChange}
          className="block text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        {fichier && (
          <p className="mt-2 text-xs text-muted-foreground">
            Fichier sélectionné : <span className="font-medium">{fichier.name}</span>
          </p>
        )}
      </div>

      {erreurGlobale && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erreurGlobale}
        </div>
      )}

      {/* ── Bouton Analyser ── */}
      {etape === 'selection' && (
        <Button onClick={analyser} disabled={!fichier || loading}>
          {loading ? 'Analyse en cours…' : 'Analyser le fichier'}
        </Button>
      )}

      {/* ── Preview ── */}
      {etape === 'preview' && preview && (
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">Résumé de l&apos;analyse</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Lignes lues</dt>
              <dd className="font-medium">{preview.total}</dd>
              <dt className="text-muted-foreground">Lignes valides</dt>
              <dd className="font-medium">{preview.valides}</dd>
              <dt className="text-muted-foreground">Personnes déjà en base</dt>
              <dd className="font-medium">{preview.personnesMatchees}</dd>
              <dt className="text-muted-foreground">Nouvelles personnes à créer</dt>
              <dd className="font-medium">{preview.personnesACreer}</dd>
              <dt className="text-muted-foreground">Doublons (ignorés)</dt>
              <dd className="font-medium">{preview.doublons}</dd>
              {preview.asidBrouillons > 0 && (
                <>
                  <dt className="text-muted-foreground">Accompagnements ASID à créer</dt>
                  <dd className="font-medium text-amber-700">{preview.asidBrouillons}</dd>
                </>
              )}
              {aDesThemes && (
                <>
                  <dt className="text-muted-foreground">Thèmes d&apos;ateliers détectés</dt>
                  <dd className="font-medium text-blue-700">{themesDetectes.length}</dd>
                </>
              )}
            </dl>
          </div>

          {preview.erreurs.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-red-700">
                {preview.erreurs.length} ligne{preview.erreurs.length > 1 ? 's' : ''} avec erreur (sera ignorée{preview.erreurs.length > 1 ? 's' : ''})
              </h3>
              <ul className="space-y-1 text-xs text-red-600">
                {preview.erreurs.slice(0, 10).map((e) => (
                  <li key={e.ligne}>Ligne {e.ligne} : {e.message}</li>
                ))}
                {preview.erreurs.length > 10 && (
                  <li className="text-muted-foreground">… et {preview.erreurs.length - 10} autre{preview.erreurs.length - 10 > 1 ? 's' : ''}</li>
                )}
              </ul>
            </div>
          )}

          {/* Section A — Correspondances similaires avec fiches en base */}
          {correspondancesSimilaires.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-blue-800">
                {correspondancesSimilaires.length} correspondance{correspondancesSimilaires.length > 1 ? 's' : ''} proposée{correspondancesSimilaires.length > 1 ? 's' : ''} avec des fiches existantes
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Ces noms dans le fichier ressemblent à des personnes déjà en base. Décochez si ce n&apos;est pas la bonne personne.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Nom (fichier)</th>
                      <th className="px-3 py-2 text-left">Prénom (fichier)</th>
                      <th className="px-3 py-2 text-center">→</th>
                      <th className="px-3 py-2 text-left">Nom (fiche existante)</th>
                      <th className="px-3 py-2 text-left">Prénom (fiche existante)</th>
                      <th className="px-3 py-2 text-right">Lignes</th>
                      <th className="px-3 py-2 text-center">Accepter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correspondancesSimilaires.map((c) => {
                      const cle = `${c.excelNom}||${c.excelPrenom}`
                      return (
                        <tr key={cle} className="border-t">
                          <td className="px-3 py-1 text-amber-700">{c.excelNom}</td>
                          <td className="px-3 py-1 text-amber-700">{c.excelPrenom}</td>
                          <td className="px-3 py-1 text-center text-muted-foreground">→</td>
                          <td className="px-3 py-1 font-medium">{c.baseNom}</td>
                          <td className="px-3 py-1 font-medium">{c.basePrenom}</td>
                          <td className="px-3 py-1 text-right text-xs text-muted-foreground">{c.lignes.join(', ')}</td>
                          <td className="px-3 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={accepterCorrespondances[cle] ?? true}
                              onChange={(e) => setAccepterCorrespondances((prev) => ({ ...prev, [cle]: e.target.checked }))}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section B — Doublons suspectés entre variantes Excel */}
          {doublonsSuspectes.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-amber-800">
                {doublonsSuspectes.length} groupe{doublonsSuspectes.length > 1 ? 's' : ''} de doublons suspectés
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Ces personnes ont des noms similaires mais ne correspondent à aucune fiche existante. Choisissez le nom correct pour chaque groupe.
              </p>
              <div className="space-y-3">
                {doublonsSuspectes.map((groupe, idx) => (
                  <div key={idx} className="rounded border bg-white p-3">
                    {groupe.variantes.map((v) => (
                      <label key={v.cle} className="flex items-center gap-2 py-1 text-sm">
                        <input
                          type="radio"
                          name={`doublon-${idx}`}
                          checked={choixDoublons[idx] === v.cle}
                          onChange={() => setChoixDoublons((prev) => ({ ...prev, [idx]: v.cle }))}
                        />
                        <span className="font-medium">{v.nom} {v.prenom}</span>
                        <span className="text-xs text-muted-foreground">
                          (ligne{v.lignes.length > 1 ? 's' : ''} {v.lignes.join(', ')})
                        </span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 py-1 text-sm border-t mt-1 pt-2">
                      <input
                        type="radio"
                        name={`doublon-${idx}`}
                        checked={choixDoublons[idx] === '__pas_doublon__'}
                        onChange={() => setChoixDoublons((prev) => ({ ...prev, [idx]: '__pas_doublon__' }))}
                      />
                      <span className="text-muted-foreground italic">Pas un doublon — garder les deux</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Noms/prénoms invalides — correction */}
          {nomsInvalides.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-amber-800">
                {nomsInvalides.length} nom{nomsInvalides.length > 1 ? 's' : ''} / prénom{nomsInvalides.length > 1 ? 's' : ''} à corriger
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Les caractères spéciaux ne sont pas acceptés. Corrigez les noms ci-dessous.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Nom actuel</th>
                      <th className="px-3 py-2 text-left">Prénom actuel</th>
                      <th className="px-3 py-2 text-left">Nom corrigé</th>
                      <th className="px-3 py-2 text-left">Prénom corrigé</th>
                      <th className="px-3 py-2 text-right">Lignes Excel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nomsInvalides.map((ni) => {
                      const corr = correctionsNoms[ni.cle] ?? { nom: ni.nom, prenom: ni.prenom }
                      return (
                        <tr key={ni.cle} className="border-t">
                          <td className={`px-3 py-1 ${ni.nomInvalide ? 'text-red-600 font-medium' : ''}`}>{ni.nom}</td>
                          <td className={`px-3 py-1 ${ni.prenomInvalide ? 'text-red-600 font-medium' : ''}`}>{ni.prenom}</td>
                          <td className="px-3 py-1">
                            {ni.nomInvalide ? (
                              <Input
                                className="h-8"
                                value={corr.nom}
                                onChange={(e) => setCorrectionsNoms((prev) => ({
                                  ...prev,
                                  [ni.cle]: { ...corr, nom: e.target.value },
                                }))}
                              />
                            ) : (
                              <span className="text-muted-foreground">{ni.nom}</span>
                            )}
                          </td>
                          <td className="px-3 py-1">
                            {ni.prenomInvalide ? (
                              <Input
                                className="h-8"
                                value={corr.prenom}
                                onChange={(e) => setCorrectionsNoms((prev) => ({
                                  ...prev,
                                  [ni.cle]: { ...corr, prenom: e.target.value },
                                }))}
                              />
                            ) : (
                              <span className="text-muted-foreground">{ni.prenom}</span>
                            )}
                          </td>
                          <td className="px-3 py-1 text-right text-muted-foreground text-xs">{ni.lignes.join(', ')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lignes sans genre — correction requise */}
          {lignesSansGenre.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-amber-800">
                {lignesSansGenre.length} ligne{lignesSansGenre.length > 1 ? 's' : ''} sans genre
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Sélectionnez le genre pour chaque personne afin de pouvoir les importer.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Ligne</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Nom</th>
                      <th className="px-3 py-2 text-left">Prénom</th>
                      <th className="px-3 py-2 text-left w-32">Genre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesSansGenre.map((r) => (
                      <tr key={r.ligne} className="border-t">
                        <td className="px-3 py-1 text-muted-foreground">{r.ligne}</td>
                        <td className="px-3 py-1">{r.date}</td>
                        <td className="px-3 py-1">{r.nom}</td>
                        <td className="px-3 py-1">{r.prenom}</td>
                        <td className="px-3 py-1">
                          <Select
                            value={correctionsGenre[String(r.ligne)] ?? ''}
                            onValueChange={(v) => setCorrectionsGenre((prev) => ({ ...prev, [String(r.ligne)]: v }))}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FEMME">Femme</SelectItem>
                              <SelectItem value="HOMME">Homme</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.apercu && lignesAvecGenre.length > 0 && (
            <div className="rounded-md border">
              <p className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aperçu des premières lignes
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Nom</th>
                      <th className="px-3 py-2 text-left">Prénom</th>
                      <th className="px-3 py-2 text-left">Genre</th>
                      <th className="px-3 py-2 text-left">ASID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesAvecGenre.map((r) => (
                      <tr key={r.ligne} className="border-t">
                        <td className="px-3 py-1">{r.date}</td>
                        <td className="px-3 py-1">{r.nom}</td>
                        <td className="px-3 py-1">{r.prenom}</td>
                        <td className="px-3 py-1">{r.genre === 'HOMME' ? 'H' : 'F'}</td>
                        <td className="px-3 py-1">{r.asid ? '✓' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Mapping des thèmes d'ateliers (intégré dans le preview) ── */}
          {aDesThemes && (
            <div className="rounded-md border p-4">
              <h3 className="mb-1 text-sm font-semibold">Actions collectives détectées</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Associez chaque thème détecté dans les commentaires à un thème existant, ou ignorez-le.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Thème détecté</th>
                      <th className="px-3 py-2 text-right w-20">Visites</th>
                      <th className="px-3 py-2 text-left">Thème existant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {themesDetectes.map((td) => (
                      <tr key={td.brut} className="border-t">
                        <td className="px-3 py-2 font-medium">{td.brut}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{td.occurrences}</td>
                        <td className="px-3 py-2">
                          <Select
                            value={mappingThemes[td.brut] ?? '__ignorer__'}
                            onValueChange={(v) => setMappingThemes((prev) => ({ ...prev, [td.brut]: v }))}
                          >
                            <SelectTrigger className="w-full max-w-xs">
                              <SelectValue placeholder="Sélectionner…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__ignorer__">
                                <span className="text-muted-foreground">— Ignorer —</span>
                              </SelectItem>
                              {categories.map((cat) => (
                                cat.themes.map((theme) => (
                                  <SelectItem key={theme.id} value={String(theme.id)}>
                                    {cat.nom} &gt; {theme.nom}
                                  </SelectItem>
                                ))
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={importer} disabled={loading || preview.valides === 0}>
              {loading ? 'Import en cours…' : `Importer ${preview.valides - preview.doublons} visite${preview.valides - preview.doublons > 1 ? 's' : ''}`}
            </Button>
            <Button variant="ghost" onClick={recommencer}>Annuler</Button>
          </div>
        </div>
      )}

      {/* ── Résultat ── */}
      {etape === 'resultat' && resultat && (
        <div className="space-y-4">
          <div className="rounded-md border border-green-300 bg-green-50 p-4">
            <h2 className="mb-3 text-base font-semibold text-green-800">Import terminé</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Visites importées</dt>
              <dd className="font-bold text-green-700">{resultat.valides - resultat.doublons}</dd>
              <dt className="text-muted-foreground">Doublons ignorés</dt>
              <dd className="font-medium">{resultat.doublons}</dd>
              {resultat.asidBrouillons > 0 && (
                <>
                  <dt className="text-muted-foreground">Accompagnements ASID créés (à compléter)</dt>
                  <dd className="font-medium text-amber-700">{resultat.asidBrouillons}</dd>
                </>
              )}
            </dl>
          </div>

          {resultat.erreurs.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-red-700">
                {resultat.erreurs.length} erreur{resultat.erreurs.length > 1 ? 's' : ''}
              </h3>
              <ul className="space-y-1 text-xs text-red-600">
                {resultat.erreurs.map((e) => (
                  <li key={`${e.ligne}-${e.message}`}>Ligne {e.ligne} : {e.message}</li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={recommencer} variant="outline">
            Nouvel import
          </Button>
        </div>
      )}
    </div>
  )
}
