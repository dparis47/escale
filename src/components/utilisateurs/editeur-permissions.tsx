'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@prisma/client'
import { Shield, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MODULES,
  MODULES_FR,
  FEATURES_FR,
  PERMISSIONS_PAR_DEFAUT,
  type Module,
  type PermissionsOverrides,
} from '@/lib/permissions'

interface Props {
  utilisateurId: number
  utilisateurNom: string
  role: Role
  permissionsOverrides: PermissionsOverrides | null
}

export function EditeurPermissions({
  utilisateurId,
  utilisateurNom,
  role,
  permissionsOverrides,
}: Props) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [overrides, setOverrides] = useState<PermissionsOverrides>(
    permissionsOverrides ?? {},
  )
  const [enChargement, setEnChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const defauts = PERMISSIONS_PAR_DEFAUT[role]

  function ouvrir() {
    setOverrides(permissionsOverrides ?? {})
    setErreur(null)
    setOuvert(true)
  }

  function valeurEffective(mod: Module, feat: string): boolean {
    const overrideMod = overrides[mod]
    if (overrideMod && feat in overrideMod) {
      return (overrideMod as Record<string, boolean | undefined>)[feat] === true
    }
    return (defauts[mod] as Record<string, boolean>)[feat]
  }

  function estOverride(mod: Module, feat: string): boolean {
    const overrideMod = overrides[mod]
    return !!overrideMod && feat in overrideMod
  }

  function toggleFeature(mod: Module, feat: string) {
    const defaut = (defauts[mod] as Record<string, boolean>)[feat]
    const actuel = valeurEffective(mod, feat)
    const nouvelleValeur = !actuel

    setOverrides((prev) => {
      const next = { ...prev }

      if (nouvelleValeur === defaut) {
        // Retour au défaut → retirer l'override
        if (next[mod]) {
          const modCopy = { ...(next[mod] as Record<string, boolean | undefined>) }
          delete modCopy[feat]
          if (Object.keys(modCopy).length === 0) {
            delete next[mod]
          } else {
            (next as Record<string, unknown>)[mod] = modCopy
          }
        }
      } else {
        // Override explicite
        const modCopy = { ...((next[mod] ?? {}) as Record<string, boolean | undefined>) }
        modCopy[feat] = nouvelleValeur
        ;(next as Record<string, unknown>)[mod] = modCopy
      }

      return next
    })
  }

  function reinitialiser() {
    setOverrides({})
  }

  const aDesOverrides = Object.keys(overrides).length > 0

  async function sauvegarder() {
    setErreur(null)
    setEnChargement(true)

    try {
      const body = {
        permissionsOverrides: aDesOverrides ? overrides : null,
      }

      const res = await fetch(`/api/utilisateurs/${utilisateurId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

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
      <Button
        variant="ghost"
        size="icon"
        onClick={ouvrir}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Permissions"
      >
        <Shield className="h-4 w-4" />
      </Button>

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Permissions — {utilisateurNom}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Les cases cochées par défaut suivent le rôle. Les modifications sont surlignées.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {(Object.keys(MODULES) as Module[]).map((mod) => {
              const features = MODULES[mod]
              return (
                <div key={mod} className="rounded-md border p-3">
                  <h3 className="mb-2 text-sm font-semibold">
                    {MODULES_FR[mod]}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                    {features.map((feat) => {
                      const actif = valeurEffective(mod, feat)
                      const override = estOverride(mod, feat)
                      return (
                        <label
                          key={feat}
                          className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors ${
                            override
                              ? 'bg-amber-50 dark:bg-amber-950/30'
                              : ''
                          }`}
                        >
                          <Checkbox
                            checked={actif}
                            onCheckedChange={() => toggleFeature(mod, feat)}
                          />
                          <span className={override ? 'font-medium' : ''}>
                            {FEATURES_FR[feat] ?? feat}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {erreur && <p className="text-sm text-destructive">{erreur}</p>}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={reinitialiser}
                disabled={!aDesOverrides}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOuvert(false)}>
                  Annuler
                </Button>
                <Button onClick={sauvegarder} disabled={enChargement}>
                  {enChargement ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
