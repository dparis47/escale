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
  const [personnes,    setPersonnes]    = useState<EntreePersonne[]>(initial)
  const [nomInput,     setNomInput]     = useState('')
  const [dateInput,    setDateInput]    = useState(dateAujourdhui)
  const [enAjout,      setEnAjout]      = useState(false)
  const [enSuppr,      setEnSuppr]      = useState<number | null>(null)
  const [enEdition,    setEnEdition]    = useState<number | null>(null)
  const [editNom,      setEditNom]      = useState('')
  const [editDate,     setEditDate]     = useState('')
  const [enSauvegarde, setEnSauvegarde] = useState(false)
  const router = useRouter()

  const personnesNommees  = personnes.filter((p) => p.nom !== ANONYME)
  const personnesAnonymes = personnes.filter((p) => p.nom === ANONYME)

  // Toutes les dates présentes (nommées + anonymes), triées
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

  async function ajouter() {
    const noms = nomInput.split('\n').map((n) => n.trim()).filter(Boolean)
    if (noms.length === 0 || !dateInput) return
    setEnAjout(true)
    const creees: EntreePersonne[] = []
    for (const nom of noms) {
      const res = await fetch('/api/personnes-partenaires', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: dateInput, partenaire, nom, dateRDV: dateInput }),
      })
      if (res.ok) {
        const created = await res.json() as { id: number; nom: string; dateRDV: string }
        creees.push({ id: created.id, nom: created.nom, dateRDV: new Date(created.dateRDV).toISOString().slice(0, 10) })
      }
    }
    if (creees.length > 0) {
      setPersonnes((prev) => [...prev, ...creees])
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
    <div className="mt-1 space-y-0.5 pl-1">

      {/* Affichage groupé par date */}
      {toutesLesDates.map((date) => {
        const nommeesDuJour  = personnesNommees.filter((p)  => p.dateRDV === date)
        const anonymesDuJour = personnesAnonymes.filter((p) => p.dateRDV === date)

        return (
          <div key={date} className="space-y-0.5">
            {/* Personnes nommées */}
            {nommeesDuJour.map((p, i) => {
              if (enEdition === p.id) {
                return (
                  <div key={p.id} className="flex items-center gap-1 text-xs">
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
                <div key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="whitespace-nowrap w-20 text-foreground/70">
                    {i === 0 ? formaterDate(date) : ''}
                  </span>
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
                    className="text-destructive hover:underline disabled:opacity-40"
                  >
                    Supprimer
                  </button>
                </div>
              )
            })}

            {/* Compteur anonymes pour cette date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="whitespace-nowrap w-20 text-foreground/70">
                {nommeesDuJour.length === 0 ? formaterDate(date) : ''}
              </span>
              <span className="italic">sans nom :</span>
              <span className="w-5 text-center font-medium text-foreground">{anonymesDuJour.length}</span>
              <button
                type="button"
                onClick={() => ajouterAnonyme(date)}
                className="h-5 w-5 rounded border border-input text-center leading-none hover:bg-muted"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => retirerAnonyme(date)}
                disabled={anonymesDuJour.length === 0}
                className="text-destructive hover:underline disabled:opacity-40"
              >
                Supprimer
              </button>
            </div>
          </div>
        )
      })}

      {/* Formulaire ajout nouvelle date */}
      <div className="flex gap-1 pt-1">
        <input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="h-6 self-start rounded border border-input px-1 text-xs w-32 shrink-0"
        />
        <textarea
          value={nomInput}
          onChange={(e) => setNomInput(e.target.value)}
          placeholder={"Un nom par ligne…"}
          className="flex-1 rounded border border-input px-1.5 py-0.5 text-xs resize-none"
          rows={2}
          maxLength={2000}
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={ajouter}
            disabled={!nomInput.trim() || !dateInput || enAjout}
            className="rounded border border-input px-2 h-6 text-xs hover:bg-muted disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => ajouterAnonyme(dateInput)}
            disabled={!dateInput}
            title="Ajouter un anonyme"
            className="rounded border border-input px-1 h-6 text-xs hover:bg-muted disabled:opacity-40 italic text-muted-foreground"
          >
            +?
          </button>
        </div>
      </div>
    </div>
  )
}
