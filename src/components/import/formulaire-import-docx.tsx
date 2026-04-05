'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface FicheApercu {
  fichier:      string | null
  nom:          string | null
  prenom:       string | null
  genre:        string | null
  genreDetecte: boolean
  dateNais:     string | null
  doublon:      boolean
}

interface ErreurDocx {
  fichier: string
  message: string
}

interface ResultatDocx {
  total:    number
  crees:    number
  misAJour: number
  doublons: number
  erreurs:  ErreurDocx[]
  apercu?:  FicheApercu[]
}

type Etape = 'selection' | 'preview' | 'resultat'

export function FormulaireImportDocx() {
  const inputRef                             = useRef<HTMLInputElement>(null)
  const [etape,           setEtape]          = useState<Etape>('selection')
  const [fichiers,        setFichiers]       = useState<FileList | null>(null)
  const [preview,         setPreview]        = useState<ResultatDocx | null>(null)
  const [resultat,        setResultat]       = useState<ResultatDocx | null>(null)
  const [loading,         setLoading]        = useState(false)
  const [erreurGlob,      setErreurGlob]     = useState<string | null>(null)
  // Corrections par fichier (clé = nom fichier)
  const [overrides, setOverrides] = useState<Record<string, { nom: string; prenom: string; genre: string }>>({})

  function onFichiersChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFichiers(e.target.files)
    setPreview(null)
    setResultat(null)
    setEtape('selection')
    setErreurGlob(null)
    setOverrides({})
  }

  function buildFormData(files: FileList) {
    const fd = new FormData()
    for (const f of Array.from(files)) fd.append('fichiers', f)
    return fd
  }

  async function analyser() {
    if (!fichiers || fichiers.length === 0) return
    setLoading(true)
    setErreurGlob(null)
    try {
      const res  = await fetch('/api/import/personnes-docx?dry_run=true', {
        method: 'POST', body: buildFormData(fichiers),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { erreur?: string } | null
        setErreurGlob(body?.erreur ?? `Erreur lors de l'analyse (${res.status}).`)
        return
      }
      const data = await res.json() as ResultatDocx
      setPreview(data)
      setEtape('preview')
      // Pré-remplir les overrides avec les genres par défaut
      const overrides: Record<string, string> = {}
      const init: Record<string, { nom: string; prenom: string; genre: string }> = {}
      for (const row of data.apercu ?? []) {
        if (row.fichier) init[row.fichier] = {
          nom:    row.nom ?? '',
          prenom: row.prenom ?? '',
          genre:  row.genre ?? 'HOMME',
        }
      }
      setOverrides(init)
    } catch (err) {
      console.error('[Import DOCX] Erreur analyse :', err)
      setErreurGlob(`Erreur lors de l'analyse : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  async function importer() {
    if (!fichiers || fichiers.length === 0) return
    setLoading(true)
    setErreurGlob(null)
    try {
      const corrections = encodeURIComponent(JSON.stringify(overrides))
      const res = await fetch(`/api/import/personnes-docx?corrections=${corrections}`, {
        method: 'POST', body: buildFormData(fichiers),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { erreur?: string } | null
        setErreurGlob(body?.erreur ?? `Erreur lors de l'import (${res.status}).`)
        return
      }
      setResultat(await res.json() as ResultatDocx)
      setEtape('resultat')
    } catch (err) {
      console.error('[Import DOCX] Erreur import :', err)
      setErreurGlob(`Erreur lors de l'import : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  function recommencer() {
    setFichiers(null); setPreview(null); setResultat(null)
    setEtape('selection'); setErreurGlob(null); setOverrides({})
    if (inputRef.current) inputRef.current.value = ''
  }

  function setField(fichier: string, field: 'nom' | 'prenom' | 'genre', value: string) {
    setOverrides((prev) => ({
      ...prev,
      [fichier]: { ...prev[fichier], [field]: value },
    }))
  }

  /** Vérifie qu'un nom/prénom ne contient que des caractères autorisés */
  function nomValide(s: string): boolean {
    if (!s.trim()) return false
    return /^[A-Za-zÀ-ÿ\s\-''ʼ`]+$/.test(s.trim())
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Sélectionnez un ou plusieurs fichiers <strong>.docx</strong> (fiches Word).
        Les personnes déjà existantes (même nom et prénom) seront mises à jour.
        Les fiches <strong>.doc</strong> (ancien format) ne sont pas supportées — ouvrez-les dans Word et enregistrez-les en .docx.
      </p>

      {/* Sélection */}
      <div className="rounded-md border p-4">
        <label className="mb-2 block text-sm font-medium">Fichiers Word (.docx)</label>
        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          multiple
          onChange={onFichiersChange}
          className="block text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        {fichiers && fichiers.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {fichiers.length} fichier{fichiers.length > 1 ? 's' : ''} sélectionné{fichiers.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {erreurGlob && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erreurGlob}
        </div>
      )}

      {etape === 'selection' && (
        <Button onClick={analyser} disabled={!fichiers || fichiers.length === 0 || loading}>
          {loading ? 'Analyse en cours…' : 'Analyser les fichiers'}
        </Button>
      )}

      {/* Preview */}
      {etape === 'preview' && preview && (
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">Résumé de l&apos;analyse</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Fichiers analysés</dt>
              <dd className="font-medium">{preview.total}</dd>
              <dt className="text-muted-foreground">Nouvelles fiches à créer</dt>
              <dd className="font-medium text-green-700">{preview.crees}</dd>
              <dt className="text-muted-foreground">Fiches existantes à mettre à jour</dt>
              <dd className="font-medium">{preview.doublons}</dd>
              {preview.erreurs.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Fichiers non lisibles</dt>
                  <dd className="font-medium text-red-600">{preview.erreurs.length}</dd>
                </>
              )}
            </dl>
          </div>

          {preview.erreurs.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-red-700">Fichiers avec erreurs</h3>
              <ul className="space-y-1 text-xs text-red-600">
                {preview.erreurs.slice(0, 15).map((e, i) => (
                  <li key={i}><span className="font-medium">{e.fichier}</span> : {e.message}</li>
                ))}
                {preview.erreurs.length > 15 && (
                  <li className="text-muted-foreground">… et {preview.erreurs.length - 15} autre(s)</li>
                )}
              </ul>
            </div>
          )}

          {preview.apercu && preview.apercu.length > 0 && (
            <div className="rounded-md border">
              <p className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fiches à importer — vérifiez et corrigez si nécessaire avant de valider
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Nom</th>
                      <th className="px-3 py-2 text-left">Prénom</th>
                      <th className="px-3 py-2 text-left">Genre</th>
                      <th className="px-3 py-2 text-left">Date naissance</th>
                      <th className="px-3 py-2 text-left">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.apercu.map((row, i) => {
                      const fichier = row.fichier ?? ''
                      const o = overrides[fichier]
                      const nomVal    = o?.nom ?? row.nom ?? ''
                      const prenomVal = o?.prenom ?? row.prenom ?? ''
                      const nomOk     = nomValide(nomVal)
                      const prenomOk  = nomValide(prenomVal)
                      const genreNonDetecte = !row.genreDetecte
                      const ligneProbleme = !nomOk || !prenomOk || genreNonDetecte
                      return (
                        <tr key={i} className={`border-t ${ligneProbleme ? 'bg-orange-50' : ''}`}>
                          <td className="px-3 py-1">
                            <input
                              type="text"
                              value={nomVal}
                              onChange={(e) => setField(fichier, 'nom', e.target.value)}
                              className={`w-full rounded border px-2 py-0.5 text-xs font-medium ${!nomOk ? 'border-red-400 bg-red-50' : ''}`}
                            />
                            {!nomOk && (
                              <span className="text-[10px] text-red-600">Nom invalide</span>
                            )}
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="text"
                              value={prenomVal}
                              onChange={(e) => setField(fichier, 'prenom', e.target.value)}
                              className={`w-full rounded border px-2 py-0.5 text-xs ${!prenomOk ? 'border-red-400 bg-red-50' : ''}`}
                            />
                            {!prenomOk && (
                              <span className="text-[10px] text-red-600">Prénom invalide</span>
                            )}
                          </td>
                          <td className="px-3 py-1">
                            <select
                              value={o?.genre ?? row.genre ?? 'HOMME'}
                              onChange={(e) => setField(fichier, 'genre', e.target.value)}
                              className={`rounded border px-2 py-0.5 text-xs ${genreNonDetecte ? 'border-orange-400 bg-orange-100 font-semibold' : ''}`}
                            >
                              <option value="HOMME">Homme</option>
                              <option value="FEMME">Femme</option>
                            </select>
                            {genreNonDetecte && (
                              <span className="ml-1.5 text-[10px] text-orange-600">à vérifier</span>
                            )}
                          </td>
                          <td className="px-3 py-1">{row.dateNais ?? '—'}</td>
                          <td className="px-3 py-1">
                            {row.doublon
                              ? <span className="text-orange-600 text-xs">Existe déjà</span>
                              : <span className="text-green-700 text-xs">Nouvelle</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(() => {
            const nbInvalides = (preview.apercu ?? []).filter((row) => {
              const o = overrides[row.fichier ?? '']
              const n = o?.nom ?? row.nom ?? ''
              const p = o?.prenom ?? row.prenom ?? ''
              return !nomValide(n) || !nomValide(p)
            }).length
            return nbInvalides > 0 ? (
              <p className="text-sm text-red-600 font-medium">
                {nbInvalides} fiche{nbInvalides > 1 ? 's' : ''} avec nom ou prénom à corriger avant import.
              </p>
            ) : null
          })()}

          <div className="flex gap-3">
            <Button onClick={importer} disabled={loading || (preview.crees + preview.doublons === 0) || (preview.apercu ?? []).some((row) => {
              const o = overrides[row.fichier ?? '']
              return !nomValide(o?.nom ?? row.nom ?? '') || !nomValide(o?.prenom ?? row.prenom ?? '')
            })}>
              {loading ? 'Import en cours…' : `Importer ${preview.crees + preview.doublons} fiche${preview.crees + preview.doublons > 1 ? 's' : ''}`}
            </Button>
            <Button variant="ghost" onClick={recommencer}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Résultat */}
      {etape === 'resultat' && resultat && (
        <div className="space-y-4">
          <div className="rounded-md border border-green-300 bg-green-50 p-4">
            <h2 className="mb-3 text-base font-semibold text-green-800">Import terminé</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Nouvelles fiches créées</dt>
              <dd className="font-bold text-green-700">{resultat.crees}</dd>
              <dt className="text-muted-foreground">Fiches mises à jour</dt>
              <dd className="font-medium">{resultat.doublons}</dd>
            </dl>
          </div>
          {resultat.erreurs.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-red-700">{resultat.erreurs.length} erreur(s)</h3>
              <ul className="space-y-1 text-xs text-red-600">
                {resultat.erreurs.map((e, i) => (
                  <li key={i}><span className="font-medium">{e.fichier}</span> : {e.message}</li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={recommencer} variant="outline">Nouvel import</Button>
        </div>
      )}
    </div>
  )
}
