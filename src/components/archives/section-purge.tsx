'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  onPurge: () => void
}

interface Apercu {
  dateLimite: string
  visites: number
  personnes: number
  accompagnements: number
  ateliers: number
  total: number
}

const OPTIONS_MOIS = [
  { value: 3, label: '3 mois' },
  { value: 6, label: '6 mois' },
  { value: 12, label: '12 mois' },
  { value: 24, label: '24 mois' },
]

export function SectionPurge({ onPurge }: Props) {
  const [mois, setMois] = useState(6)
  const [apercu, setApercu] = useState<Apercu | null>(null)
  const [chargement, setChargement] = useState(false)
  const [dialogOuvert, setDialogOuvert] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function calculer() {
    setChargement(true)
    setApercu(null)
    try {
      const res = await fetch(`/api/archives/purge?mois=${mois}`)
      if (res.ok) {
        const data = await res.json()
        setApercu(data)
      }
    } finally {
      setChargement(false)
    }
  }

  async function executer() {
    setEnCours(true)
    try {
      const res = await fetch('/api/archives/purge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mois }),
      })
      if (res.ok) {
        setDialogOuvert(false)
        setApercu(null)
        setConfirmation('')
        onPurge()
      }
    } finally {
      setEnCours(false)
    }
  }

  function formaterDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="mb-6 rounded-md border border-red-200 bg-red-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trash2 className="h-4 w-4 text-red-600" />
        <h2 className="text-sm font-semibold text-red-800">Purge des archives</h2>
      </div>

      <p className="mb-3 text-xs text-red-700">
        Supprimer définitivement les éléments archivés depuis plus de :
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={mois}
          onChange={(e) => { setMois(Number(e.target.value)); setApercu(null) }}
        >
          {OPTIONS_MOIS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={calculer} disabled={chargement}>
          {chargement ? 'Calcul…' : 'Calculer'}
        </Button>
      </div>

      {apercu && (
        <div className="mt-3">
          {apercu.total === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun élément archivé avant le {formaterDate(apercu.dateLimite)}.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {apercu.visites > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {apercu.visites} visite{apercu.visites > 1 ? 's' : ''}
                  </span>
                )}
                {apercu.personnes > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {apercu.personnes} personne{apercu.personnes > 1 ? 's' : ''}
                  </span>
                )}
                {apercu.accompagnements > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {apercu.accompagnements} accompagnement{apercu.accompagnements > 1 ? 's' : ''}
                  </span>
                )}
                {apercu.ateliers > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {apercu.ateliers} atelier{apercu.ateliers > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-red-700 mb-2">
                Archivés avant le {formaterDate(apercu.dateLimite)} — {apercu.total} élément{apercu.total > 1 ? 's' : ''} au total.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setConfirmation(''); setDialogOuvert(true) }}
              >
                Purger définitivement
              </Button>
            </>
          )}
        </div>
      )}

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suppression définitive des archives</DialogTitle>
            <DialogDescription>
              Vous allez supprimer définitivement {apercu?.total} élément{(apercu?.total ?? 0) > 1 ? 's' : ''} archivé{(apercu?.total ?? 0) > 1 ? 's' : ''} depuis
              plus de {mois} mois. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Tapez <span className="font-mono font-bold text-red-600">PURGER</span> pour confirmer :
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="PURGER"
              className="font-mono"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={executer}
              disabled={confirmation !== 'PURGER' || enCours}
            >
              {enCours ? 'Suppression…' : 'Confirmer la purge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
