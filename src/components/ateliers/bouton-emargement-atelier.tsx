'use client'

import { useRef, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { SessionAtelierData } from '@/schemas/atelier'

interface Fichier { id: number; nom: string }

interface Props {
  sessions:  SessionAtelierData[]
  peutGerer: boolean
}

export function BoutonEmargementAtelier({ sessions, peutGerer }: Props) {
  const [fichiersParSession, setFichiersParSession] = useState<Map<number, Fichier[]>>(
    () => new Map(sessions.map((s) => [s.id, [...s.fichiers]]))
  )
  const [ouvert,  setOuvert]  = useState(false)
  const [enCours, setEnCours] = useState(false)

  const inputRefs = useRef<Map<number, HTMLInputElement | null>>(new Map())

  const nbTotal = [...fichiersParSession.values()].reduce((sum, fs) => sum + fs.length, 0)

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

  async function supprimer(sessionId: number, fichierId: number) {
    if (!confirm("Supprimer cette feuille d'émargement ?")) return
    setEnCours(true)
    try {
      const res = await fetch(`/api/ateliers/emargement/${fichierId}`, { method: 'DELETE' })
      if (res.ok) {
        setFichiersParSession((prev) => {
          const next = new Map(prev)
          const liste = next.get(sessionId) ?? []
          next.set(sessionId, liste.filter((f) => f.id !== fichierId))
          return next
        })
      }
    } finally {
      setEnCours(false)
    }
  }

  async function deposer(sessionId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setEnCours(true)
    try {
      const form = new FormData()
      form.append('fichier', fichier)
      const res = await fetch(`/api/ateliers/emargement?atelierId=${sessionId}`, {
        method: 'POST',
        body:   form,
      })
      if (res.ok) {
        const nouveau: Fichier = await res.json()
        setFichiersParSession((prev) => {
          const next  = new Map(prev)
          const liste = next.get(sessionId) ?? []
          next.set(sessionId, [...liste, nouveau])
          return next
        })
      }
    } finally {
      setEnCours(false)
      const input = inputRefs.current.get(sessionId)
      if (input) input.value = ''
    }
  }

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${nbTotal > 0 ? 'text-foreground hover:text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setOuvert(!ouvert)}
            disabled={enCours}
          >
            <Paperclip className="h-4 w-4" />
            {nbTotal > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                {nbTotal}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {nbTotal > 0
            ? `${nbTotal} feuille${nbTotal > 1 ? 's' : ''} d'émargement`
            : "Feuilles d'émargement"}
        </TooltipContent>
      </Tooltip>

      {ouvert && (
        <div className="absolute right-0 top-9 z-50 min-w-[260px] max-w-[320px] rounded-md border bg-white shadow-lg">
          <div className="max-h-72 overflow-y-auto">
            {sessions.map((s, i) => {
              const fichiers = fichiersParSession.get(s.id) ?? []
              return (
                <div key={s.id} className={i > 0 ? 'border-t' : ''}>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {s.date}
                      {s.themeAutre && (
                        <span className="ml-1 font-normal text-foreground">{s.themeAutre}</span>
                      )}
                    </span>
                  </div>
                  {fichiers.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 px-3 py-1 hover:bg-muted/50">
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
                          onClick={() => supprimer(s.id, f.id)}
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
                        ref={(el) => { inputRefs.current.set(s.id, el) }}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => deposer(s.id, e)}
                      />
                      <button
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        onClick={() => inputRefs.current.get(s.id)?.click()}
                        disabled={enCours}
                      >
                        + Joindre un PDF
                      </button>
                    </>
                  )}
                  {!peutGerer && fichiers.length === 0 && (
                    <p className="px-3 pb-1.5 text-xs text-muted-foreground">Aucune feuille jointe.</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
