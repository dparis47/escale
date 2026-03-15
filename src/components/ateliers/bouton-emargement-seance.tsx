'use client'

import { useRef, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface Fichier { id: number; nom: string }

interface Props {
  atelierId: number
  fichiers:  Fichier[]
  peutGerer: boolean
}

export function BoutonEmargementSeance({ atelierId, fichiers: initFichiers, peutGerer }: Props) {
  const [fichiers, setFichiers] = useState<Fichier[]>(initFichiers)
  const [ouvert,   setOuvert]   = useState(false)
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
      const res = await fetch(`/api/ateliers/emargement?atelierId=${atelierId}`, {
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

  const nbFichiers = fichiers.length

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${nbFichiers > 0 ? 'text-foreground hover:text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setOuvert(!ouvert)}
            disabled={enCours}
          >
            <Paperclip className="h-4 w-4" />
            {nbFichiers > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                {nbFichiers}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {nbFichiers > 0
            ? `${nbFichiers} feuille${nbFichiers > 1 ? 's' : ''} d'émargement`
            : "Feuille d'émargement"}
        </TooltipContent>
      </Tooltip>

      {ouvert && (
        <div className="absolute right-0 top-9 z-50 min-w-[220px] rounded-md border bg-white p-2 shadow-lg">
          {fichiers.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-muted/50">
              <button
                type="button"
                className="flex-1 truncate text-left text-xs text-blue-600 hover:underline"
                onClick={() => telecharger(f)}
                disabled={enCours}
                title={f.nom}
              >
                {f.nom}
              </button>
              {peutGerer && (
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => supprimer(f.id)}
                  disabled={enCours}
                  title="Supprimer"
                >
                  ✕
                </button>
              )}
            </div>
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
              <button
                type="button"
                className="mt-1 w-full rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                onClick={() => inputRef.current?.click()}
                disabled={enCours}
              >
                + Joindre un PDF
              </button>
            </>
          )}
          {!peutGerer && fichiers.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">Aucune feuille jointe.</p>
          )}
        </div>
      )}
    </div>
  )
}
