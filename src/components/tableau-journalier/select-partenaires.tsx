'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const PARTENAIRES_LABELS = ['TSSI', 'Job47', 'Acor', 'Parcours éco futé', 'As CAF']

interface Props {
  visitId:             number
  initialPartenaires:  string[]
}

export function SelectPartenaires({ visitId, initialPartenaires }: Props) {
  const [partenaires, setPartenaires] = useState<string[]>(initialPartenaires)
  const [ouvert,      setOuvert]      = useState(false)
  const [texteLibre,  setTexteLibre]  = useState('')
  const [enSauvegarde, setEnSauvegarde] = useState(false)
  const conteneurRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Ferme le popover si clic en dehors
  useEffect(() => {
    if (!ouvert) return
    function handleClick(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ouvert])

  async function sauvegarder(prochains: string[]) {
    setPartenaires(prochains)
    setEnSauvegarde(true)
    try {
      await fetch(`/api/visites/${visitId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ partenaires: prochains }),
      })
      router.refresh()
    } finally {
      setEnSauvegarde(false)
    }
  }

  function toggle(nom: string) {
    const suivants = partenaires.includes(nom)
      ? partenaires.filter((p) => p !== nom)
      : [...partenaires, nom]
    sauvegarder(suivants)
  }

  function ajouterLibre() {
    const v = texteLibre.trim()
    if (!v || partenaires.includes(v)) return
    sauvegarder([...partenaires, v])
    setTexteLibre('')
  }

  const partenairesLibres = partenaires.filter((p) => !PARTENAIRES_LABELS.includes(p))

  return (
    <div ref={conteneurRef} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className={`min-w-[2rem] rounded border border-transparent px-1.5 py-0.5 text-left text-xs hover:border-input hover:bg-muted/50 ${enSauvegarde ? 'opacity-50' : ''}`}
      >
        {partenaires.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {partenaires.map((p) => (
              <span key={p} className="rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700 border border-violet-200">
                {p}
              </span>
            ))}
          </div>
        )}
      </button>

      {ouvert && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border bg-background p-3 shadow-md space-y-1.5">
          {/* Partenaires standards */}
          {PARTENAIRES_LABELS.map((nom) => (
            <div key={nom} className="flex items-center gap-2">
              <Checkbox
                id={`prt-${visitId}-${nom}`}
                checked={partenaires.includes(nom)}
                onCheckedChange={() => toggle(nom)}
              />
              <Label
                htmlFor={`prt-${visitId}-${nom}`}
                className="cursor-pointer font-normal text-sm"
              >
                {nom}
              </Label>
            </div>
          ))}

          {/* Partenaires libres déjà saisis */}
          {partenairesLibres.map((nom) => (
            <div key={nom} className="flex items-center gap-2">
              <Checkbox
                id={`prt-${visitId}-libre-${nom}`}
                checked
                onCheckedChange={() => toggle(nom)}
              />
              <Label
                htmlFor={`prt-${visitId}-libre-${nom}`}
                className="cursor-pointer font-normal text-sm"
              >
                {nom}
              </Label>
            </div>
          ))}

          {/* Saisie libre */}
          <div className="flex gap-1 border-t pt-1.5">
            <Input
              value={texteLibre}
              onChange={(e) => setTexteLibre(e.target.value)}
              className="h-7 flex-1 text-xs"
              placeholder="Autre partenaire…"
              maxLength={100}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); ajouterLibre() }
              }}
            />
            <button
              type="button"
              onClick={ajouterLibre}
              disabled={!texteLibre.trim()}
              className="rounded border border-input px-2 text-xs hover:bg-muted disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
