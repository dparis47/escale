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
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { COULEURS_DISPONIBLES } from '@/schemas/atelier'
import type { CategorieAvecThemes } from '@/schemas/atelier'

// ── Dialogue création de catégorie ──────────────────────────────────────────

export function DialogueCreerCategorie({ apresOrdre }: { apresOrdre?: number } = {}) {
  const router = useRouter()
  const [ouvert, setOuvert]           = useState(false)
  const [nom, setNom]                 = useState('')
  const [couleur, setCouleur]         = useState('gray')
  const [themes, setThemes]           = useState<string[]>([''])
  const [erreur, setErreur]           = useState('')
  const [enChargement, setEnChargement] = useState(false)

  function reinitialiser() {
    setNom('')
    setCouleur('gray')
    setThemes([''])
    setErreur('')
  }

  function ajouterTheme() {
    setThemes((prev) => [...prev, ''])
  }

  function modifierTheme(index: number, value: string) {
    setThemes((prev) => prev.map((t, i) => (i === index ? value : t)))
  }

  function retirerTheme(index: number) {
    setThemes((prev) => prev.filter((_, i) => i !== index))
  }

  async function soumettre() {
    setErreur('')
    const themesValides = themes.map((t) => t.trim()).filter(Boolean)
    if (!nom.trim()) { setErreur('Le nom est requis.'); return }
    if (themesValides.length === 0) { setErreur('Au moins un thème est requis.'); return }

    setEnChargement(true)
    try {
      const res = await fetch('/api/categories-ateliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: nom.trim(), couleur, themes: themesValides, apresOrdre }),
      })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreur(data.erreur ?? 'Erreur lors de la création.')
        return
      }
      setOuvert(false)
      reinitialiser()
      router.refresh()
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => { setOuvert(o); if (!o) reinitialiser() }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Ajouter une catégorie">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle catégorie</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nom de la catégorie</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : santé - bien-être" maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label>Couleur</Label>
            <Select value={couleur} onValueChange={setCouleur}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COULEURS_DISPONIBLES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Thèmes</Label>
            {themes.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={t}
                  onChange={(e) => modifierTheme(i, e.target.value)}
                  placeholder="Nom du thème"
                  maxLength={100}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  onClick={() => retirerTheme(i)}
                  disabled={themes.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={ajouterTheme}>
              + Ajouter un thème
            </Button>
          </div>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOuvert(false)} disabled={enChargement}>Annuler</Button>
            <Button onClick={soumettre} disabled={enChargement}>
              {enChargement ? 'Création…' : 'Créer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Dialogue modification de catégorie ──────────────────────────────────────

interface PropsModifier {
  categorie: CategorieAvecThemes
}

export function DialogueModifierCategorie({ categorie }: PropsModifier) {
  const router = useRouter()
  const [ouvert, setOuvert]             = useState(false)
  const [nom, setNom]                   = useState(categorie.nom)
  const [couleur, setCouleur]           = useState(categorie.couleur)
  const [themesExistants, setThemesExistants] = useState(categorie.themes.map((t) => ({ ...t, modifie: false, nouveauNom: t.nom })))
  const [nouveauxThemes, setNouveauxThemes]   = useState<string[]>([])
  const [themesSupprimes, setThemesSupprimes] = useState<number[]>([])
  const [erreur, setErreur]             = useState('')
  const [enChargement, setEnChargement] = useState(false)

  function reinitialiser() {
    setNom(categorie.nom)
    setCouleur(categorie.couleur)
    setThemesExistants(categorie.themes.map((t) => ({ ...t, modifie: false, nouveauNom: t.nom })))
    setNouveauxThemes([])
    setThemesSupprimes([])
    setErreur('')
  }

  async function soumettre() {
    setErreur('')
    setEnChargement(true)
    try {
      const themesRenommes = themesExistants
        .filter((t) => t.modifie && t.nouveauNom.trim() !== t.nom)
        .map((t) => ({ id: t.id, nom: t.nouveauNom.trim() }))

      const themesAjoutes = nouveauxThemes.map((t) => t.trim()).filter(Boolean)

      const body: Record<string, unknown> = {}
      if (nom.trim() !== categorie.nom) body.nom = nom.trim()
      if (couleur !== categorie.couleur) body.couleur = couleur
      if (themesRenommes.length > 0) body.themesRenommes = themesRenommes
      if (themesAjoutes.length > 0) body.themesAjoutes = themesAjoutes
      if (themesSupprimes.length > 0) body.themesSupprimes = themesSupprimes

      if (Object.keys(body).length === 0) { setOuvert(false); return }

      const res = await fetch(`/api/categories-ateliers/${categorie.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreur(data.erreur ?? 'Erreur lors de la mise à jour.')
        return
      }
      setOuvert(false)
      router.refresh()
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => { setOuvert(o); if (!o) reinitialiser() }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier « {categorie.nom} »</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label>Couleur</Label>
            <Select value={couleur} onValueChange={setCouleur}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COULEURS_DISPONIBLES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Thèmes existants</Label>
            {themesExistants
              .filter((t) => !themesSupprimes.includes(t.id))
              .map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <Input
                    value={t.nouveauNom}
                    onChange={(e) => {
                      setThemesExistants((prev) =>
                        prev.map((x) => x.id === t.id ? { ...x, nouveauNom: e.target.value, modifie: true } : x)
                      )
                    }}
                    maxLength={100}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => setThemesSupprimes((prev) => [...prev, t.id])}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

            {nouveauxThemes.length > 0 && (
              <>
                <Label className="mt-3 block text-xs text-muted-foreground">Nouveaux thèmes</Label>
                {nouveauxThemes.map((t, i) => (
                  <div key={`new-${i}`} className="flex items-center gap-2">
                    <Input
                      value={t}
                      onChange={(e) => setNouveauxThemes((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                      placeholder="Nouveau thème"
                      maxLength={100}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground"
                      onClick={() => setNouveauxThemes((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </>
            )}

            <Button type="button" variant="outline" size="sm" onClick={() => setNouveauxThemes((prev) => [...prev, ''])}>
              + Ajouter un thème
            </Button>
          </div>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOuvert(false)} disabled={enChargement}>Annuler</Button>
            <Button onClick={soumettre} disabled={enChargement}>
              {enChargement ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
