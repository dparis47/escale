'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PersonneOption {
  id:     number
  nom:    string
  prenom: string
}

interface Referent {
  id:     number
  nom:    string
  prenom: string
}

interface Props {
  referents: Referent[]
}

export function FormulaireNouveauASID({ referents }: Props) {
  const router = useRouter()

  const [personneSelectionnee, setPersonneSelectionnee] = useState<PersonneOption | null>(null)
  const [recherchePersonne,    setRecherchePersonne]    = useState('')
  const [suggestions,          setSuggestions]          = useState<PersonneOption[]>([])
  const [afficherSuggestions,  setAfficherSuggestions]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // FSE
  const [dateFSEEntree, setDateFSEEntree] = useState('')
  const [referentId,    setReferentId]    = useState('')

  // ASID
  const [prescripteurNom,    setPrescripteurNom]    = useState('')
  const [prescripteurPrenom, setPrescripteurPrenom] = useState('')
  const [referentNom,        setReferentNom]        = useState('')
  const [referentPrenom,     setReferentPrenom]      = useState('')
  const [dateASIDEntree,     setDateASIDEntree]      = useState('')

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
    if (!dateFSEEntree) {
      setErreur("La date d'entrée FSE est obligatoire.")
      return
    }
    if (!dateASIDEntree) {
      setErreur("La date d'entrée ASID est obligatoire.")
      return
    }

    setEnChargement(true)
    try {
      const res = await fetch('/api/accompagnement', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          personId:   personneSelectionnee.id,
          dateEntree: dateFSEEntree,
          referentId: referentId ? Number(referentId) : undefined,
          suiviASID: {
            dateEntree:        dateASIDEntree,
            prescripteurNom:   prescripteurNom   || undefined,
            prescripteurPrenom: prescripteurPrenom || undefined,
            referentNom:       referentNom       || undefined,
            referentPrenom:    referentPrenom    || undefined,
          },
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
              {personneSelectionnee.nom} {personneSelectionnee.prenom}
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
                    {p.nom} {p.prenom}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* FSE */}
      <fieldset className="rounded border p-4 space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">FSE+</legend>
        <div className="space-y-1.5">
          <Label className="text-sm">{"Date d'entrée FSE *"}</Label>
          <Input type="date" value={dateFSEEntree} onChange={(e) => setDateFSEEntree(e.target.value)} className="max-w-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Référent FSE</Label>
          <Select value={referentId || 'none'} onValueChange={(v) => setReferentId(v === 'none' ? '' : v)}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Sélectionner un référent…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Aucun —</SelectItem>
              {referents.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.nom} {r.prenom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </fieldset>

      {/* ASID */}
      <fieldset className="rounded border p-4 space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">ASID</legend>
        <div className="space-y-1.5">
          <Label className="text-sm">{"Date d'entrée ASID *"}</Label>
          <Input type="date" value={dateASIDEntree} onChange={(e) => setDateASIDEntree(e.target.value)} className="max-w-xs" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Prescripteur nom</Label>
            <Input value={prescripteurNom} onChange={(e) => setPrescripteurNom(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Prescripteur prénom</Label>
            <Input value={prescripteurPrenom} onChange={(e) => setPrescripteurPrenom(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Référent RSA nom</Label>
            <Input value={referentNom} onChange={(e) => setReferentNom(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Référent RSA prénom</Label>
            <Input value={referentPrenom} onChange={(e) => setReferentPrenom(e.target.value)} maxLength={100} />
          </div>
        </div>
      </fieldset>

      {erreur && <p className="text-sm text-destructive">{erreur}</p>}

      <Button onClick={soumettre} disabled={enChargement}>
        {enChargement ? 'Création…' : 'Créer le suivi ASID'}
      </Button>
    </div>
  )
}
