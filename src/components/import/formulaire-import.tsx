'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

export interface ResultatImport {
  total:             number
  valides:           number
  doublons:          number
  mpisCrees:         number
  misAJour:          number
  erreurs:           { ligne: number; message: string }[]
  apercu?:           Record<string, string | number | boolean>[]
}

type Etape = 'selection' | 'preview' | 'resultat'

interface Props {
  /** URL de l'API d'import (ex: /api/import/personnes) */
  apiUrl:       string
  /** Description affichée pour l'utilisateur */
  description:  string
  /** Colonnes à afficher dans l'aperçu (clés des objets retournés) */
  colonnesApercu: string[]
  /** Labels des colonnes d'aperçu */
  labelsApercu:   string[]
  /** Label pour le compteur principal (ex: "personne", "accompagnement") */
  labelEntite:  string
}

export function FormulaireImport({
  apiUrl,
  description,
  colonnesApercu,
  labelsApercu,
  labelEntite,
}: Props) {
  const inputRef              = useRef<HTMLInputElement>(null)
  const [etape, setEtape]     = useState<Etape>('selection')
  const [fichier, setFichier] = useState<File | null>(null)
  const [preview, setPreview] = useState<ResultatImport | null>(null)
  const [resultat, setResultat] = useState<ResultatImport | null>(null)
  const [loading, setLoading] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null)

  function onFichierChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFichier(f)
    setPreview(null)
    setResultat(null)
    setEtape('selection')
    setErreurGlobale(null)
  }

  async function analyser() {
    if (!fichier) return
    setLoading(true)
    setErreurGlobale(null)
    try {
      const fd = new FormData()
      fd.append('fichier', fichier)
      const res  = await fetch(`${apiUrl}?dry_run=true`, { method: 'POST', body: fd })
      if (!res.ok) {
        setErreurGlobale('Erreur lors de l\'analyse du fichier.')
        return
      }
      const data = await res.json() as ResultatImport
      setPreview(data)
      setEtape('preview')
    } catch {
      setErreurGlobale('Erreur lors de l\'analyse du fichier.')
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
      const res  = await fetch(apiUrl, { method: 'POST', body: fd })
      if (!res.ok) {
        setErreurGlobale('Erreur lors de l\'import.')
        return
      }
      const data = await res.json() as ResultatImport
      setResultat(data)
      setEtape('resultat')
    } catch {
      setErreurGlobale('Erreur lors de l\'import.')
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
    if (inputRef.current) inputRef.current.value = ''
  }

  const nbAImporter = preview ? preview.valides - preview.doublons : 0
  const pluriel = (n: number) => n > 1 ? 's' : ''

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-muted-foreground">{description}</p>

      {/* Sélection du fichier */}
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

      {/* Bouton Analyser */}
      {etape === 'selection' && (
        <Button onClick={analyser} disabled={!fichier || loading}>
          {loading ? 'Analyse en cours…' : 'Analyser le fichier'}
        </Button>
      )}

      {/* Preview */}
      {etape === 'preview' && preview && (
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">Résumé de l&apos;analyse</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Lignes lues</dt>
              <dd className="font-medium">{preview.total}</dd>
              <dt className="text-muted-foreground">Lignes valides</dt>
              <dd className="font-medium">{preview.valides}</dd>
              <dt className="text-muted-foreground">Doublons (ignorés)</dt>
              <dd className="font-medium">{preview.doublons}</dd>
              {preview.mpisCrees > 0 && (
                <>
                  <dt className="text-muted-foreground">Nouvelles entrées à créer</dt>
                  <dd className="font-medium">{preview.mpisCrees}</dd>
                </>
              )}
              {preview.misAJour > 0 && (
                <>
                  <dt className="text-muted-foreground">Entrées existantes à mettre à jour</dt>
                  <dd className="font-medium">{preview.misAJour}</dd>
                </>
              )}
            </dl>
          </div>

          {preview.erreurs.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-red-700">
                {preview.erreurs.length} ligne{pluriel(preview.erreurs.length)} avec erreur
              </h3>
              <ul className="space-y-1 text-xs text-red-600">
                {preview.erreurs.slice(0, 10).map((e) => (
                  <li key={`${e.ligne}-${e.message}`}>Ligne {e.ligne} : {e.message}</li>
                ))}
                {preview.erreurs.length > 10 && (
                  <li className="text-muted-foreground">… et {preview.erreurs.length - 10} autre{pluriel(preview.erreurs.length - 10)}</li>
                )}
              </ul>
            </div>
          )}

          {preview.apercu && preview.apercu.length > 0 && (
            <div className="rounded-md border">
              <p className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aperçu des premières lignes
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      {labelsApercu.map((label) => (
                        <th key={label} className="px-3 py-2 text-left">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.apercu.map((row, i) => (
                      <tr key={i} className="border-t">
                        {colonnesApercu.map((col) => (
                          <td key={col} className="px-3 py-1">
                            {typeof row[col] === 'boolean' ? (row[col] ? '✓' : '') : String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={importer} disabled={loading || nbAImporter === 0}>
              {loading ? 'Import en cours…' : `Importer ${nbAImporter} ${labelEntite}${pluriel(nbAImporter)}`}
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
              <dt className="text-muted-foreground">{labelEntite}{pluriel(resultat.valides - resultat.doublons)} importé{pluriel(resultat.valides - resultat.doublons)}{(resultat.valides - resultat.doublons) > 1 ? 'e' : ''}s</dt>
              <dd className="font-bold text-green-700">{resultat.valides - resultat.doublons}</dd>
              <dt className="text-muted-foreground">Doublons ignorés</dt>
              <dd className="font-medium">{resultat.doublons}</dd>
            </dl>
          </div>

          {resultat.erreurs.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-red-700">
                {resultat.erreurs.length} erreur{pluriel(resultat.erreurs.length)}
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
