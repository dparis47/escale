'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@prisma/client'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Mode = 'creation' | 'edition'

interface UtilisateurExistant {
  id: number
  nom: string
  prenom: string
  email: string
  role: Role
}

interface Props {
  mode: Mode
  utilisateur?: UtilisateurExistant
  sessionRole?: Role
}

const ROLES_FR: Record<Role, string> = {
  ACCUEIL: 'Accueil',
  TRAVAILLEUR_SOCIAL: 'Travailleur social',
  DIRECTION: 'Direction',
  ADMIN: 'Administrateur',
}

export function FormulaireUtilisateur({ mode, utilisateur, sessionRole }: Props) {
  const router = useRouter()
  const [ouvert, setOuvert]         = useState(false)
  const [nom, setNom]               = useState(utilisateur?.nom ?? '')
  const [prenom, setPrenom]         = useState(utilisateur?.prenom ?? '')
  const [email, setEmail]           = useState(utilisateur?.email ?? '')
  const [password, setPassword]     = useState('')
  const [role, setRole]             = useState<Role | ''>(utilisateur?.role ?? '')
  const [erreur, setErreur]         = useState<string | null>(null)
  const [enChargement, setEnChargement] = useState(false)

  function ouvrir() {
    if (mode === 'creation') {
      setNom('')
      setPrenom('')
      setEmail('')
      setPassword('')
      setRole('')
    } else {
      setPassword('')
    }
    setErreur(null)
    setOuvert(true)
  }

  async function soumettre() {
    if (!nom.trim()) { setErreur('Le nom est requis.'); return }
    if (!prenom.trim()) { setErreur('Le prénom est requis.'); return }
    if (!email.trim()) { setErreur('L\'email est requis.'); return }
    if (!role) { setErreur('Le rôle est requis.'); return }
    if (mode === 'creation' && !password) { setErreur('Le mot de passe est requis.'); return }
    if (password && password.length < 6) { setErreur('Le mot de passe doit faire au moins 6 caractères.'); return }

    setErreur(null)
    setEnChargement(true)

    try {
      const url = mode === 'edition' ? `/api/utilisateurs/${utilisateur!.id}` : '/api/utilisateurs'
      const method = mode === 'edition' ? 'PATCH' : 'POST'

      const body: Record<string, string> = { nom, prenom, email, role }
      if (password) body.password = password

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        setErreur('Un utilisateur avec cet email existe déjà.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErreur(data?.erreur ?? 'Une erreur est survenue.')
        return
      }

      setOuvert(false)
      router.refresh()
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <>
      {mode === 'creation' ? (
        <Button onClick={ouvrir}>+ Nouvel utilisateur</Button>
      ) : (
        <Button variant="ghost" size="icon" onClick={ouvrir} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === 'creation' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nom">Nom *</Label>
                <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={100} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={100} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">
                {mode === 'creation' ? 'Mot de passe *' : 'Nouveau mot de passe (laisser vide pour ne pas changer)'}
              </Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={100} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="role">Rôle *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLES_FR) as [Role, string][])
                    .filter(([val]) => val !== 'ADMIN' || sessionRole === 'ADMIN')
                    .map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {erreur && <p className="text-sm text-destructive">{erreur}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOuvert(false)}>Annuler</Button>
              <Button onClick={soumettre} disabled={enChargement}>
                {enChargement ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
