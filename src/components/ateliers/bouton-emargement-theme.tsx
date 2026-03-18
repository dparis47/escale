'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface Fichier { id: number; nom: string }

interface Props {
  theme:     string
  label:     string
  fichiers:  Fichier[]
  peutGerer: boolean
}

export function BoutonEmargementTheme({ theme, label, fichiers: initFichiers, peutGerer }: Props) {
  const [fichiers, setFichiers] = useState<Fichier[]>(initFichiers)
  const [enCours,  setEnCours]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function telecharger(fichier: Fichier) {
    setEnCours(true)
    try {
      const res = await fetch(`/api/ateliers/emargement/${fichier.id}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = fichier.nom
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setEnCours(false)
    }
  }

  async function supprimer(id: number) {
    if (!confirm("Supprimer cette feuille d'émargement ?")) return
    setEnCours(true)
    try {
      const res = await fetch(`/api/ateliers/emargement/${id}`, { method: 'DELETE' })
      if (res.ok) setFichiers((prev) => prev.filter((f) => f.id !== id))
    } finally {
      setEnCours(false)
    }
  }

  async function deposer(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setEnCours(true)
    try {
      const form = new FormData()
      form.append('fichier', fichier)
      const res = await fetch(`/api/ateliers/emargement?theme=${theme}`, {
        method: 'POST',
        body:   form,
      })
      if (res.ok) {
        const nouveau: Fichier = await res.json()
        setFichiers((prev) => [...prev, nouveau])
      }
    } finally {
      setEnCours(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {fichiers.map((f) => (
        <span key={f.id} className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs font-normal normal-case opacity-70 hover:opacity-100"
            onClick={() => telecharger(f)}
            disabled={enCours}
            title={`Télécharger — ${f.nom}`}
          >
            Feuille d&apos;émargement
          </Button>
          {peutGerer && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-xs opacity-40 hover:opacity-100 hover:text-destructive"
              onClick={() => supprimer(f.id)}
              disabled={enCours}
              title={`Supprimer — ${f.nom}`}
            >
              ✕
            </Button>
          )}
        </span>
      ))}
      {peutGerer && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={deposer}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs font-normal normal-case opacity-50 hover:opacity-100"
            onClick={() => inputRef.current?.click()}
            disabled={enCours}
            title={`Joindre une feuille d'émargement — ${label}`}
          >
            + Joindre une feuille d&apos;émargement
          </Button>
        </>
      )}
    </div>
  )
}
