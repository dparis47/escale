'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Pencil, Trash2, Settings } from 'lucide-react'
import type { PrestataireOption } from '@/schemas/atelier'

interface Props {
  prestataires: PrestataireOption[]
  onRefresh: () => void
}

export function DialogueGererPrestataires({ prestataires, onRefresh }: Props) {
  const router = useRouter()
  const [ouvert, setOuvert]                = useState(false)
  const [nouveauNom, setNouveauNom]        = useState('')
  const [renommages, setRenommages]        = useState<Map<number, string>>(new Map())
  const [erreur, setErreur]                = useState('')
  const [erreurAjout, setErreurAjout]      = useState('')
  const [enChargement, setEnChargement]    = useState(false)

  async function ajouterPrestataire() {
    const nom = nouveauNom.trim()
    if (!nom) return
    setErreurAjout('')
    setEnChargement(true)
    try {
      const res = await fetch('/api/prestataires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom }),
      })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreurAjout(data.erreur ?? 'Erreur.')
        return
      }
      setNouveauNom('')
      onRefresh()
      router.refresh()
    } catch {
      setErreurAjout('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  async function renommerPrestataire(id: number) {
    const nom = renommages.get(id)?.trim()
    if (!nom) return
    setErreur('')
    setEnChargement(true)
    try {
      const res = await fetch(`/api/prestataires/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom }),
      })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreur(data.erreur ?? 'Erreur.')
        return
      }
      setRenommages((prev) => { const m = new Map(prev); m.delete(id); return m })
      onRefresh()
      router.refresh()
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  async function supprimerPrestataire(id: number) {
    setErreur('')
    setEnChargement(true)
    try {
      const res = await fetch(`/api/prestataires/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreur(data.erreur ?? 'Erreur.')
        return
      }
      onRefresh()
      router.refresh()
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer les prestataires</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Ajouter un prestataire */}
          <div className="space-y-1.5">
            <Label>Ajouter un prestataire</Label>
            <div className="flex gap-2">
              <Input
                value={nouveauNom}
                onChange={(e) => setNouveauNom(e.target.value)}
                placeholder="Nom du prestataire"
                maxLength={200}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterPrestataire() } }}
              />
              <Button onClick={ajouterPrestataire} disabled={enChargement || !nouveauNom.trim()} size="sm">
                Ajouter
              </Button>
            </div>
            {erreurAjout && <p className="text-xs text-destructive">{erreurAjout}</p>}
          </div>

          {/* Liste des prestataires */}
          <div className="space-y-1.5">
            <Label>Prestataires existants ({prestataires.length})</Label>
            {prestataires.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun prestataire.</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {prestataires.map((p) => {
                  const enEdition = renommages.has(p.id)
                  return (
                    <div key={p.id} className="flex items-center gap-1.5">
                      {enEdition ? (
                        <>
                          <Input
                            value={renommages.get(p.id) ?? ''}
                            onChange={(e) => setRenommages((prev) => new Map(prev).set(p.id, e.target.value))}
                            className="h-8 text-sm"
                            maxLength={200}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); renommerPrestataire(p.id) } }}
                          />
                          <Button size="sm" variant="outline" className="h-8" onClick={() => renommerPrestataire(p.id)} disabled={enChargement}>
                            OK
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setRenommages((prev) => { const m = new Map(prev); m.delete(p.id); return m })}>
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">{p.nom}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => setRenommages((prev) => new Map(prev).set(p.id, p.nom))}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => supprimerPrestataire(p.id)}
                            disabled={enChargement}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOuvert(false)}>Fermer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
