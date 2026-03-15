'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LogEntry {
  id: number
  action: string
  entite: string
  entiteId: number
  details: string | null
  userName: string
  createdAt: string
}

const ACTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'creer', label: 'Création' },
  { value: 'modifier', label: 'Modification' },
  { value: 'supprimer', label: 'Suppression' },
  { value: 'restaurer', label: 'Restauration' },
]

const ENTITES = [
  { value: '', label: 'Toutes les entités' },
  { value: 'visite', label: 'Visite' },
  { value: 'personne', label: 'Personne' },
  { value: 'accompagnement', label: 'Accompagnement' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'utilisateur', label: 'Utilisateur' },
]

const ACTION_LABELS: Record<string, string> = {
  creer: 'Création',
  modifier: 'Modification',
  supprimer: 'Suppression',
  restaurer: 'Restauration',
}

const ACTION_COLORS: Record<string, string> = {
  creer: 'bg-green-100 text-green-700',
  modifier: 'bg-blue-100 text-blue-700',
  supprimer: 'bg-red-100 text-red-700',
  restaurer: 'bg-purple-100 text-purple-700',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [filtreAction, setFiltreAction] = useState('')
  const [filtreEntite, setFiltreEntite] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const charger = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (filtreAction) params.set('action', filtreAction)
    if (filtreEntite) params.set('entite', filtreEntite)
    if (dateDebut) params.set('dateDebut', dateDebut)
    if (dateFin) params.set('dateFin', dateFin)

    const res = await fetch(`/api/audit?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    }
    setLoading(false)
  }, [page, filtreAction, filtreEntite, dateDebut, dateFin])

  useEffect(() => {
    charger()
  }, [charger])

  function formaterDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function reinitialiserFiltres() {
    setFiltreAction('')
    setFiltreEntite('')
    setDateDebut('')
    setDateFin('')
    setPage(1)
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Journal d&apos;activité</h1>
      <p className="mb-6 text-sm text-muted-foreground">{total} entrée{total > 1 ? 's' : ''}</p>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Action</label>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={filtreAction}
            onChange={(e) => { setFiltreAction(e.target.value); setPage(1) }}
          >
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Entité</label>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={filtreEntite}
            onChange={(e) => { setFiltreEntite(e.target.value); setPage(1) }}
          >
            {ENTITES.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Du</label>
          <Input
            type="date"
            className="w-40"
            value={dateDebut}
            onChange={(e) => { setDateDebut(e.target.value); setPage(1) }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Au</label>
          <Input
            type="date"
            className="w-40"
            value={dateFin}
            onChange={(e) => { setDateFin(e.target.value); setPage(1) }}
          />
        </div>
        {(filtreAction || filtreEntite || dateDebut || dateFin) && (
          <Button variant="ghost" size="sm" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Chargement…</p>
      ) : logs.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Aucune entrée dans le journal.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Utilisateur</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Entité</th>
                <th className="px-3 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {formaterDate(log.createdAt)}
                  </td>
                  <td className="px-3 py-2 font-medium">{log.userName}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 capitalize">{log.entite}</td>
                  <td className="px-3 py-2 text-muted-foreground">#{log.entiteId}</td>
                  <td className="px-3 py-2 text-muted-foreground">{log.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)}>
              ← Précédent
            </Button>
          )}
          <span className="text-muted-foreground">Page {page} / {totalPages}</span>
          {page < totalPages && (
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>
              Suivant →
            </Button>
          )}
        </div>
      )}
    </main>
  )
}
