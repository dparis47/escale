'use client'

import { useEffect, useRef, useState } from 'react'
import type { Genre } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { capitaliserPrenom } from '@/lib/dates'

type PersonneResultat = {
  id: number
  nom: string
  prenom: string
  genre: Genre
}

interface Props {
  onSelect: (personne: PersonneResultat) => void
  valeurInitiale?: string
}

export function RecherchePersonne({ onSelect, valeurInitiale = '' }: Props) {
  const [query, setQuery]           = useState(valeurInitiale)
  const [resultats, setResultats]   = useState<PersonneResultat[]>([])
  const [ouvert, setOuvert]         = useState(false)
  const [chargement, setChargement] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const conteneurRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResultats([])
      setOuvert(false)
      return
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setChargement(true)
      try {
        const res = await fetch(`/api/personnes/recherche?q=${encodeURIComponent(query)}`)
        const data = (await res.json()) as PersonneResultat[]
        setResultats(data)
        setOuvert(true)
      } finally {
        setChargement(false)
      }
    }, 300)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectionner(personne: PersonneResultat) {
    setQuery(`${capitaliserPrenom(personne.prenom)} ${personne.nom.toUpperCase()}`)
    setOuvert(false)
    onSelect(personne)
  }

  return (
    <div ref={conteneurRef} className="relative">
      <Input
        placeholder="Rechercher par nom ou prénom…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {chargement && (
        <p className="mt-1 text-xs text-muted-foreground">Recherche…</p>
      )}
      {ouvert && !chargement && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md">
          {resultats.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Aucune personne trouvée.
            </p>
          ) : (
            <ul>
              {resultats.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => selectionner(p)}
                  >
                    {p.nom.toUpperCase()} {capitaliserPrenom(p.prenom)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {p.genre === 'HOMME' ? 'H' : 'F'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
