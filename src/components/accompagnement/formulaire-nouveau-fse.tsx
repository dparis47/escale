'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { capitaliserPrenom } from '@/lib/dates'

interface PersonneOption {
  id:     number
  nom:    string
  prenom: string
}

interface Props {
  personneInitiale?: PersonneOption | null
}

export function FormulaireNouveauFSE({ personneInitiale }: Props = {}) {
  const router = useRouter()

  const [personneSelectionnee, setPersonneSelectionnee] = useState<PersonneOption | null>(personneInitiale ?? null)
  const [recherchePersonne,    setRecherchePersonne]    = useState('')
  const [suggestions,          setSuggestions]          = useState<PersonneOption[]>([])
  const [afficherSuggestions,  setAfficherSuggestions]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [dateEntree, setDateEntree] = useState('')

  const [erreur,       setErreur]       = useState('')
  const [enChargement, setEnChargement] = useState(false)

  const chercherPersonnes = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return }
    const res = await fetch(`/api/personnes/recherche?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = await res.json() as PersonneOption[]
      setSuggestions(data)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => chercherPersonnes(recherchePersonne), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [recherchePersonne, chercherPersonnes])

  async function soumettre() {
    setErreur('')
    if (!personneSelectionnee) {
      setErreur('Veuillez sélectionner une personne.')
      return
    }
    if (!dateEntree) {
      setErreur("La date d'entrée est obligatoire.")
      return
    }

    setEnChargement(true)
    try {
      const res = await fetch('/api/accompagnement', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          personId:   personneSelectionnee.id,
          dateEntree,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreur(data.erreur ?? 'Une erreur est survenue.')
        return
      }
      const data = await res.json() as { id: number }
      router.push(`/accompagnement/${data.id}`)
    } catch {
      setErreur('Une erreur réseau est survenue.')
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Personne */}
      <div className="space-y-1.5">
        <Label className="text-sm">Personne suivie *</Label>
        {personneSelectionnee ? (
          <div className="flex items-center gap-2">
            <span className="rounded border px-3 py-2 text-sm bg-muted">
              {personneSelectionnee.nom.toUpperCase()} {capitaliserPrenom(personneSelectionnee.prenom)}
            </span>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => { setPersonneSelectionnee(null); setRecherchePersonne('') }}
            >
              Changer
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              placeholder="Rechercher par nom ou prénom…"
              value={recherchePersonne}
              onChange={(e) => { setRecherchePersonne(e.target.value); setAfficherSuggestions(true) }}
              onFocus={() => setAfficherSuggestions(true)}
              onBlur={() => setTimeout(() => setAfficherSuggestions(false), 150)}
              autoComplete="off"
            />
            {afficherSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md text-sm">
                {suggestions.map((p) => (
                  <li
                    key={p.id}
                    className="cursor-pointer px-3 py-2 hover:bg-muted"
                    onMouseDown={() => {
                      setPersonneSelectionnee(p)
                      setRecherchePersonne('')
                      setAfficherSuggestions(false)
                    }}
                  >
                    {p.nom.toUpperCase()} {capitaliserPrenom(p.prenom)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Date d'entrée */}
      <div className="space-y-1.5">
        <Label className="text-sm">{"Date d'entrée FSE *"}</Label>
        <Input
          type="date"
          value={dateEntree}
          onChange={(e) => setDateEntree(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {erreur && <p className="text-sm text-destructive">{erreur}</p>}

      <Button onClick={soumettre} disabled={enChargement}>
        {enChargement ? 'Création…' : 'Créer le suivi FSE+'}
      </Button>
    </div>
  )
}
