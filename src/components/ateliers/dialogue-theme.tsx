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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Settings, Trash2 } from 'lucide-react'
import type { CategorieAvecThemes } from '@/schemas/atelier'

interface Props {
  categories: CategorieAvecThemes[]
  onRefresh: () => void
}

export function DialogueGererThemes({ categories, onRefresh }: Props) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [categorieId, setCategorieId] = useState<number | null>(null)
  const [nouveauNom, setNouveauNom] = useState('')
  const [renommages, setRenommages] = useState<Map<number, string>>(new Map())
  const [erreur, setErreur] = useState('')
  const [erreurAjout, setErreurAjout] = useState('')
  const [enChargement, setEnChargement] = useState(false)

  async function ajouterTheme() {
    const nom = nouveauNom.trim()
    if (!nom || !categorieId) return
    setErreurAjout('')
    setEnChargement(true)
    try {
      const res = await fetch(`/api/categories-ateliers/${categorieId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themesAjoutes: [nom] }),
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

  async function renommerTheme(themeId: number, catId: number) {
    const nom = renommages.get(themeId)?.trim()
    if (!nom) return
    setErreur('')
    setEnChargement(true)
    try {
      const res = await fetch(`/api/categories-ateliers/${catId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themesRenommes: [{ id: themeId, nom }] }),
      })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreur(data.erreur ?? 'Erreur.')
        return
      }
      setRenommages((prev) => { const m = new Map(prev); m.delete(themeId); return m })
      onRefresh()
      router.refresh()
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  async function supprimerTheme(themeId: number, catId: number) {
    setErreur('')
    setEnChargement(true)
    try {
      const res = await fetch(`/api/categories-ateliers/${catId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themesSupprimes: [themeId] }),
      })
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
          <DialogTitle>Gérer les thèmes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Ajouter un thème */}
          <div className="space-y-1.5">
            <Label>Ajouter un thème</Label>
            <div className="flex gap-2">
              <Select
                value={categorieId ? String(categorieId) : undefined}
                onValueChange={(v) => setCategorieId(Number(v))}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Catégorie…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={nouveauNom}
                onChange={(e) => setNouveauNom(e.target.value)}
                placeholder="Nom du thème"
                maxLength={200}
                className="flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterTheme() } }}
              />
              <Button onClick={ajouterTheme} disabled={enChargement || !nouveauNom.trim() || !categorieId} size="sm">
                Ajouter
              </Button>
            </div>
            {erreurAjout && <p className="text-xs text-destructive">{erreurAjout}</p>}
          </div>

          {/* Liste des thèmes groupés par catégorie */}
          <div className="space-y-3">
            <Label>Thèmes existants</Label>
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat.nom}</p>
                  {cat.themes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun thème.</p>
                  ) : (
                    <div className="space-y-1">
                      {cat.themes.map((t) => {
                        const enEdition = renommages.has(t.id)
                        return (
                          <div key={t.id} className="flex items-center gap-1.5">
                            {enEdition ? (
                              <>
                                <Input
                                  value={renommages.get(t.id) ?? ''}
                                  onChange={(e) => setRenommages((prev) => new Map(prev).set(t.id, e.target.value))}
                                  className="h-8 text-sm"
                                  maxLength={200}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); renommerTheme(t.id, cat.id) } }}
                                />
                                <Button size="sm" variant="outline" className="h-8" onClick={() => renommerTheme(t.id, cat.id)} disabled={enChargement}>
                                  OK
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setRenommages((prev) => { const m = new Map(prev); m.delete(t.id); return m })}>
                                  Annuler
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-sm">{t.nom}</span>
                                <div className="flex shrink-0 items-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground"
                                    onClick={() => setRenommages((prev) => new Map(prev).set(t.id, t.nom))}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 ${(!t._count || t._count.ateliers === 0) ? 'text-destructive' : 'invisible'}`}
                                    onClick={() => supprimerTheme(t.id, cat.id)}
                                    disabled={enChargement || (t._count && t._count.ateliers > 0)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
