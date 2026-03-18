'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { capitaliserPrenom } from '@/lib/dates'

interface PersonneOption {
  id:     number
  nom:    string
  prenom: string
}

interface Participant {
  id:       number
  personId: number
  person:   PersonneOption
}

interface VisiteurSansFiche {
  nom:    string | null
  prenom: string | null
}

interface Props {
  atelierId:    number
  participants: Participant[]
}

export function SectionParticipants({ atelierId, participants: init }: Props) {
  const [participants,        setParticipants]        = useState<Participant[]>(init)
  const [sansFiche,           setSansFiche]           = useState<VisiteurSansFiche[]>([])
  const [ajouterOuvert,       setAjouterOuvert]       = useState(false)
  const [recherche,           setRecherche]           = useState('')
  const [suggestions,         setSuggestions]         = useState<PersonneOption[]>([])
  const [afficherSuggestions, setAfficherSuggestions] = useState(false)
  const [enCours,             setEnCours]             = useState(false)
  const [erreur,              setErreur]              = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-import des personnes avec fiche + motif ATELIERS ce jour-là
  useEffect(() => {
    fetch(`/api/ateliers/${atelierId}/importer-visiteurs`, { method: 'POST' })
      .then((r) => r.ok ? r.json() : { ajouts: [] })
      .then((data: { ajouts?: Participant[] }) => {
        const nouveaux = data.ajouts ?? []
        if (nouveaux.length === 0) return
        setParticipants((prev) => {
          const liste = [...prev, ...nouveaux]
          return liste.sort((a, b) => {
            const cmp = a.person.nom.localeCompare(b.person.nom, 'fr')
            return cmp !== 0 ? cmp : a.person.prenom.localeCompare(b.person.prenom, 'fr')
          })
        })
      })
      .catch(() => {})
  }, [atelierId])

  // Chargement des visiteurs sans fiche du même jour (tableau journalier)
  useEffect(() => {
    fetch(`/api/ateliers/${atelierId}/visiteurs-sans-fiche`)
      .then((r) => r.ok ? r.json() : { visiteurs: [] })
      .then((data: { visiteurs?: VisiteurSansFiche[] }) => {
        setSansFiche(data.visiteurs ?? [])
      })
      .catch(() => {})
  }, [atelierId])

  const chercherPersonnes = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return }
    const res = await fetch(`/api/personnes/recherche?q=${encodeURIComponent(q)}`)
    if (res.ok) setSuggestions(await res.json() as PersonneOption[])
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => chercherPersonnes(recherche), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [recherche, chercherPersonnes])

  async function ajouterParticipant(personne: PersonneOption) {
    setAfficherSuggestions(false)
    setRecherche('')
    setSuggestions([])
    setErreur(null)
    setEnCours(true)
    try {
      const res = await fetch(`/api/ateliers/${atelierId}/participants`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ personId: personne.id }),
      })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreur(data.erreur ?? 'Erreur lors de l\'ajout.')
        return
      }
      const nouveau = await res.json() as Participant
      setParticipants((prev) => {
        const liste = [...prev, nouveau]
        return liste.sort((a, b) => {
          const cmp = a.person.nom.localeCompare(b.person.nom, 'fr')
          return cmp !== 0 ? cmp : a.person.prenom.localeCompare(b.person.prenom, 'fr')
        })
      })
      setAjouterOuvert(false)
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnCours(false)
    }
  }

  async function supprimerParticipant(pid: number) {
    if (!confirm('Retirer ce participant de l\'atelier ?')) return
    setEnCours(true)
    await fetch(`/api/ateliers/${atelierId}/participants/${pid}`, { method: 'DELETE' })
    setParticipants((prev) => prev.filter((p) => p.id !== pid))
    setEnCours(false)
  }

  const total = participants.length + sansFiche.length

  return (
    <div className="space-y-4">

      {/* En-tête avec total */}
      {total > 0 && (
        <p className="text-sm text-muted-foreground">
          {total} participant{total > 1 ? 's' : ''} au total
        </p>
      )}

      {/* Liste unifiée */}
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun participant enregistré.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {/* Personnes avec fiche */}
          {participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="font-medium">
                {p.person.nom.toUpperCase()} {capitaliserPrenom(p.person.prenom)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => supprimerParticipant(p.id)}
                disabled={enCours}
              >
                Supprimer
              </Button>
            </li>
          ))}
          {/* Personnes sans fiche — issues du tableau journalier, lecture seule */}
          {sansFiche.map((v, i) => (
            <li key={`sf-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="font-medium">
                {v.nom ? v.nom.toUpperCase() : ''}{v.prenom ? ` ${capitaliserPrenom(v.prenom)}` : ''}
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  fiche à créer
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Ajout manuel */}
      {ajouterOuvert ? (
        <div className="relative">
          <Input
            autoFocus
            placeholder="Rechercher une personne (min. 2 caractères)…"
            value={recherche}
            onChange={(e) => { setRecherche(e.target.value); setAfficherSuggestions(true) }}
            onFocus={() => setAfficherSuggestions(true)}
            onBlur={() => setTimeout(() => setAfficherSuggestions(false), 150)}
            disabled={enCours}
          />
          {afficherSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md">
              {suggestions.map((s) => (
                <li
                  key={s.id}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-muted"
                  onMouseDown={() => ajouterParticipant(s)}
                >
                  {s.nom.toUpperCase()} {capitaliserPrenom(s.prenom)}
                </li>
              ))}
            </ul>
          )}
          {erreur && <p className="mt-1 text-xs text-destructive">{erreur}</p>}
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 text-muted-foreground"
            onClick={() => { setAjouterOuvert(false); setRecherche(''); setErreur(null) }}
          >
            Annuler
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAjouterOuvert(true)}>
          + Ajouter un participant
        </Button>
      )}
    </div>
  )
}
