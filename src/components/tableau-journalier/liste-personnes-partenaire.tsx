'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface EntreePersonne {
  id:      number
  nom:     string
  dateRDV: string  // ISO date
}

interface Props {
  partenaire: string
  initial:    EntreePersonne[]
}

const ANONYME = '(anonyme)'

function formaterDate(iso: string) {
  return new Date(iso + 'T00:00:00.000Z').toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  })
}

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10)
}

export function ListePersonnesPartenaire({ partenaire, initial }: Props) {
  const [personnes,        setPersonnes]        = useState<EntreePersonne[]>(initial)
  const [nomInputParDate,  setNomInputParDate]  = useState<Record<string, string>>({})
  const [dateInput,        setDateInput]        = useState(dateAujourdhui)
  const [nomInput,         setNomInput]         = useState('')
  const [enAjout,          setEnAjout]          = useState(false)
  const [enSuppr,          setEnSuppr]          = useState<number | null>(null)
  const [enEdition,        setEnEdition]        = useState<number | null>(null)
  const [editNom,          setEditNom]          = useState('')
  const [editDate,         setEditDate]         = useState('')
  const [enSauvegarde,     setEnSauvegarde]     = useState(false)
  const router = useRouter()

  const personnesNommees  = personnes.filter((p) => p.nom !== ANONYME)
  const personnesAnonymes = personnes.filter((p) => p.nom === ANONYME)

  const toutesLesDates = [...new Set(personnes.map((p) => p.dateRDV))].sort()

  function ouvrirEdition(p: EntreePersonne) {
    setEnEdition(p.id)
    setEditNom(p.nom)
    setEditDate(p.dateRDV)
  }

  async function sauvegarder(id: number) {
    if (!editNom.trim() || !editDate) return
    setEnSauvegarde(true)
    const res = await fetch(`/api/personnes-partenaires/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nom: editNom.trim(), dateRDV: editDate }),
    })
    if (res.ok) {
      setPersonnes((prev) => prev.map((p) =>
        p.id === id ? { ...p, nom: editNom.trim(), dateRDV: editDate } : p
      ))
      setEnEdition(null)
      router.refresh()
    }
    setEnSauvegarde(false)
  }

  async function ajouterNomme(date: string) {
    const nom = (nomInputParDate[date] ?? '').trim()
    if (!nom) return
    setEnAjout(true)
    const res = await fetch('/api/personnes-partenaires', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ date, partenaire, nom, dateRDV: date }),
    })
    if (res.ok) {
      const created = await res.json() as { id: number; nom: string; dateRDV: string }
      setPersonnes((prev) => [...prev, {
        id:      created.id,
        nom:     created.nom,
        dateRDV: new Date(created.dateRDV).toISOString().slice(0, 10),
      }])
      setNomInputParDate((prev) => ({ ...prev, [date]: '' }))
      router.refresh()
    }
    setEnAjout(false)
  }

  async function ajouterDepuisFormulaire() {
    if (!dateInput) return
    const nom = nomInput.trim()
    setEnAjout(true)
    const res = await fetch('/api/personnes-partenaires', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        date:       dateInput,
        partenaire,
        nom:        nom || ANONYME,
        dateRDV:    dateInput,
      }),
    })
    if (res.ok) {
      const created = await res.json() as { id: number; nom: string; dateRDV: string }
      setPersonnes((prev) => [...prev, {
        id:      created.id,
        nom:     created.nom,
        dateRDV: new Date(created.dateRDV).toISOString().slice(0, 10),
      }])
      setNomInput('')
      router.refresh()
    }
    setEnAjout(false)
  }

  async function supprimer(id: number) {
    setEnSuppr(id)
    await fetch(`/api/personnes-partenaires/${id}`, { method: 'DELETE' })
    setPersonnes((prev) => prev.filter((p) => p.id !== id))
    setEnSuppr(null)
    router.refresh()
  }

  async function ajouterAnonyme(date: string) {
    const res = await fetch('/api/personnes-partenaires', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ date, partenaire, nom: ANONYME, dateRDV: date }),
    })
    if (res.ok) {
      const created = await res.json() as { id: number; nom: string; dateRDV: string }
      setPersonnes((prev) => [...prev, {
        id:      created.id,
        nom:     ANONYME,
        dateRDV: new Date(created.dateRDV).toISOString().slice(0, 10),
      }])
      router.refresh()
    }
  }

  async function retirerAnonyme(date: string) {
    const anonymes = personnesAnonymes.filter((p) => p.dateRDV === date)
    const dernier  = anonymes.at(-1)
    if (!dernier) return
    await fetch(`/api/personnes-partenaires/${dernier.id}`, { method: 'DELETE' })
    setPersonnes((prev) => prev.filter((p) => p.id !== dernier.id))
    router.refresh()
  }

  return (
    <div className="mt-1 space-y-2 pl-1">

      {/* Affichage groupé par date */}
      {toutesLesDates.map((date) => {
        const nommeesDuJour  = personnesNommees.filter((p)  => p.dateRDV === date)
        const anonymesDuJour = personnesAnonymes.filter((p) => p.dateRDV === date)
        const total          = nommeesDuJour.length + anonymesDuJour.length

        return (
          <div key={date} className="space-y-0.5">

            {/* Ligne date + compteur total */}
            <div className="flex items-center gap-2 text-xs">
              <span className="whitespace-nowrap w-20 shrink-0 text-foreground/70">
                {formaterDate(date)}
              </span>
              <span className="text-muted-foreground">Nombre de personnes :</span>
              <span className="w-6 text-center font-medium text-foreground">{total}</span>
              <button
                type="button"
                onClick={() => retirerAnonyme(date)}
                disabled={anonymesDuJour.length === 0}
                className="h-5 w-5 rounded border border-input text-center leading-none hover:bg-muted disabled:opacity-40"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => ajouterAnonyme(date)}
                className="h-5 w-5 rounded border border-input text-center leading-none hover:bg-muted"
              >
                +
              </button>
            </div>

            {/* Personnes nommées */}
            {nommeesDuJour.map((p) => {
              if (enEdition === p.id) {
                return (
                  <div key={p.id} className="flex items-center gap-1 pl-20 text-xs">
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-6 rounded border border-input px-1 text-xs w-28 shrink-0"
                    />
                    <input
                      type="text"
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                      className="h-6 flex-1 rounded border border-input px-1.5 text-xs"
                      onKeyDown={(e) => { if (e.key === 'Enter') sauvegarder(p.id) }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => sauvegarder(p.id)}
                      disabled={enSauvegarde}
                      className="text-blue-600 hover:underline disabled:opacity-40"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnEdition(null)}
                      className="text-muted-foreground hover:underline"
                    >
                      Annuler
                    </button>
                  </div>
                )
              }
              return (
                <div key={p.id} className="flex items-center gap-2 pl-20 text-xs text-muted-foreground">
                  <span className="flex-1">{p.nom}</span>
                  <button
                    type="button"
                    onClick={() => ouvrirEdition(p)}
                    className="text-foreground hover:underline"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => supprimer(p.id)}
                    disabled={enSuppr === p.id}
                    className="text-muted-foreground hover:text-foreground hover:underline disabled:opacity-40"
                  >
                    Supprimer
                  </button>
                </div>
              )
            })}

            {/* Input ajout nom pour cette date */}
            <div className="flex items-center gap-1 pl-20">
              <input
                type="text"
                value={nomInputParDate[date] ?? ''}
                onChange={(e) => setNomInputParDate((prev) => ({ ...prev, [date]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') ajouterNomme(date) }}
                placeholder="Nom…"
                className="h-6 w-32 rounded border border-input px-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => ajouterNomme(date)}
                disabled={!(nomInputParDate[date] ?? '').trim() || enAjout}
                className="h-6 rounded border border-input px-2 text-xs hover:bg-muted disabled:opacity-40"
              >
                Ajouter
              </button>
            </div>
          </div>
        )
      })}

      {/* Formulaire nouvelle date */}
      <div className="flex items-center gap-1 pt-1">
        <input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="h-6 rounded border border-input px-1 text-xs w-32 shrink-0"
        />
        <input
          type="text"
          value={nomInput}
          onChange={(e) => setNomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ajouterDepuisFormulaire() }}
          placeholder="Nom (optionnel)…"
          className="h-6 flex-1 rounded border border-input px-1.5 text-xs"
        />
        <button
          type="button"
          onClick={ajouterDepuisFormulaire}
          disabled={!dateInput || enAjout}
          className="h-6 rounded border border-input px-2 text-xs hover:bg-muted disabled:opacity-40"
        >
          Ajouter
        </button>
      </div>
    </div>
  )
}
