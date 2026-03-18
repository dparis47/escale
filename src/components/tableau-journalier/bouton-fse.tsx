'use client'

import { useState } from 'react'

interface Props {
  visiteId: number
  dejaFSE:  boolean  // une autre visite de cette personne est déjà FSE cette année
  fse:      boolean  // cette visite elle-même est marquée FSE
}

export function BoutonFSE({ visiteId, dejaFSE, fse: initFSE }: Props) {
  const [fse, setFse] = useState(initFSE)
  const [enCours, setEnCours] = useState(false)

  async function basculerFSE(valeur: boolean) {
    setEnCours(true)
    try {
      const res = await fetch(`/api/visites/${visiteId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fse: valeur }),
      })
      if (res.ok) setFse(valeur)
    } finally {
      setEnCours(false)
    }
  }

  // Cette visite est marquée FSE — badge cliquable pour décocher
  if (fse) {
    return (
      <button
        type="button"
        onClick={() => basculerFSE(false)}
        disabled={enCours}
        title="Comptée pour le FSE — cliquer pour décocher"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold transition-colors hover:bg-red-400 disabled:opacity-50"
      >
        ✓
      </button>
    )
  }

  // Déjà comptée via une autre visite — on n'affiche rien
  if (dejaFSE) return null

  // Pas encore comptée — bouton cercle vide cliquable
  return (
    <button
      type="button"
      onClick={() => basculerFSE(true)}
      disabled={enCours}
      title="Marquer comme compté·e pour le FSE cette année"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/40 transition-colors hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
    />
  )
}
