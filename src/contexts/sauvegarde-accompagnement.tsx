'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type SaveFn = () => Promise<void>

interface SauvegardeContextType {
  register:        (key: string, fn: SaveFn) => void
  unregister:      (key: string) => void
  sauvegarderTout: () => Promise<void>
  modeEdition:     boolean
  setModeEdition:  (v: boolean) => void
}

const SauvegardeContext = createContext<SauvegardeContextType | null>(null)

export function SauvegardeProvider({ children }: { children: React.ReactNode }) {
  const registry = useRef(new Map<string, SaveFn>())
  const [modeEdition, setModeEdition] = useState(false)

  function register(key: string, fn: SaveFn) {
    registry.current.set(key, fn)
  }

  function unregister(key: string) {
    registry.current.delete(key)
  }

  async function sauvegarderTout() {
    const fns = Array.from(registry.current.values())
    await Promise.all(fns.map((fn) => fn()))
  }

  return (
    <SauvegardeContext.Provider value={{ register, unregister, sauvegarderTout, modeEdition, setModeEdition }}>
      {children}
    </SauvegardeContext.Provider>
  )
}

/**
 * Enregistre la fonction de sauvegarde d'une section dans le contexte global.
 * La référence interne est toujours à jour (pattern "latest ref").
 */
export function useRegistrerSauvegarde(key: string | null, fn: SaveFn) {
  const ctx = useContext(SauvegardeContext)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!ctx || !key) return
    ctx.register(key, () => fnRef.current())
    return () => ctx.unregister(key)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, key])
}

/** Retourne l'état du mode édition (false = vue, true = édition). */
export function useModeEdition() {
  return useContext(SauvegardeContext)?.modeEdition ?? false
}

/** Retourne la fonction setModeEdition pour basculer le mode depuis un composant enfant. */
export function useSetModeEdition() {
  const ctx = useContext(SauvegardeContext)
  return ctx?.setModeEdition ?? (() => {})
}

/** Bouton toggle "Modifier" / "Enregistrer" — à placer dans le header sticky. */
export function BoutonEnregistrerGlobal() {
  const ctx = useContext(SauvegardeContext)
  const [enCours, setEnCours] = useState(false)
  const [erreur,  setErreur]  = useState(false)

  if (!ctx) return null

  if (!ctx.modeEdition) {
    return (
      <Button
        variant="outline"
        onClick={() => { ctx.setModeEdition(true); setErreur(false) }}
      >
        Modifier
      </Button>
    )
  }

  async function enregistrerTout() {
    setEnCours(true)
    setErreur(false)
    try {
      await ctx!.sauvegarderTout()
      ctx!.setModeEdition(false)
    } catch {
      setErreur(true)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {erreur && <span className="text-sm text-destructive">Erreur.</span>}
      <Button onClick={enregistrerTout} disabled={enCours}>
        {enCours ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
      <Button
        variant="outline"
        onClick={() => { ctx.setModeEdition(false); setErreur(false) }}
        disabled={enCours}
      >
        Annuler
      </Button>
    </div>
  )
}
