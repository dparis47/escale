'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

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
    genre:   string
    asid:    boolean
  }[]
}

type Etape = 'selection' | 'preview' | 'resultat'

export function FormulaireImportVisites() {
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
      const res  = await fetch('/api/import/visites?dry_run=true', { method: 'POST', body: fd })
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
      const res  = await fetch('/api/import/visites', { method: 'POST', body: fd })
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

          {preview.apercu && preview.apercu.length > 0 && (
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
                    {preview.apercu.map((r) => (
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
