'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10)
}

export function AjouterPartenaire() {
  const [ouvert,      setOuvert]      = useState(false)
  const [nomPartenaire, setNomPartenaire] = useState('')
  const [dateInput,   setDateInput]   = useState(dateAujourdhui)
  const [enCours,     setEnCours]     = useState(false)
  const router = useRouter()

  async function ajouter() {
    const nom = nomPartenaire.trim()
    if (!nom || !dateInput) return
    setEnCours(true)
    const res = await fetch('/api/personnes-partenaires', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ date: dateInput, partenaire: nom, nom: '(anonyme)', dateRDV: dateInput }),
    })
    if (res.ok) {
      setNomPartenaire('')
      setDateInput(dateAujourdhui())
      setOuvert(false)
      router.refresh()
    }
    setEnCours(false)
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <span className="text-base leading-none">+</span> Ajouter un partenaire
      </button>
    )
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        type="text"
        value={nomPartenaire}
        onChange={(e) => setNomPartenaire(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') ajouter() }}
        placeholder="Nom du partenaire…"
        autoFocus
        className="h-7 rounded border border-input px-2 text-sm w-48"
      />
      <input
        type="date"
        value={dateInput}
        onChange={(e) => setDateInput(e.target.value)}
        className="h-7 rounded border border-input px-1 text-xs w-32"
      />
      <button
        type="button"
        onClick={ajouter}
        disabled={!nomPartenaire.trim() || !dateInput || enCours}
        className="h-7 rounded border border-input px-3 text-xs hover:bg-muted disabled:opacity-40"
      >
        Ajouter
      </button>
      <button
        type="button"
        onClick={() => setOuvert(false)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Annuler
      </button>
    </div>
  )
}
