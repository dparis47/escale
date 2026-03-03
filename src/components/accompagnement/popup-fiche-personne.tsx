'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formaterDateCourte } from '@/lib/dates'

interface PersonData {
  id:               number
  nom:              string
  prenom:           string
  genre:            string
  dateNaissance:    Date | null
  adresse:          string | null
  telephone:        string | null
  mobile:           string | null
  email:            string | null
  nationalite:      string | null
  numeroSecu:       string | null
  dateActualisation:Date | null
}

interface Props {
  personId: number
  label?:   string
}

function Ligne({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  if (!valeur) return null
  return (
    <div className="flex gap-2 py-0.5 text-sm">
      <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
      <span>{valeur as string}</span>
    </div>
  )
}

export function PopupFichePersonne({ personId, label = 'Voir la fiche personne' }: Props) {
  const [personne, setPersonne] = useState<PersonData | null>(null)
  const [chargement, setChargement] = useState(false)
  const [ouvert, setOuvert] = useState(false)

  async function charger() {
    if (personne) return
    setChargement(true)
    try {
      const res = await fetch(`/api/personnes/${personId}`)
      if (res.ok) {
        const data = await res.json() as PersonData
        setPersonne(data)
      }
    } catch {
      // silently fail
    } finally {
      setChargement(false)
    }
  }

  function handleOpenChange(open: boolean) {
    setOuvert(open)
    if (open) charger()
  }

  const ageCalcule = personne?.dateNaissance
    ? Math.floor((Date.now() - new Date(personne.dateNaissance).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <Dialog open={ouvert} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto p-0 text-sm text-blue-600">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {personne
              ? `${personne.nom.toUpperCase()} ${personne.prenom}`
              : 'Fiche personne'}
          </DialogTitle>
        </DialogHeader>

        {chargement && (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        )}

        {personne && (
          <div className="space-y-4">
            {ageCalcule !== null && (
              <p className="text-sm text-muted-foreground">{ageCalcule} ans · {personne.genre === 'HOMME' ? 'Homme' : 'Femme'}</p>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
              <Ligne label="Adresse"   valeur={personne.adresse} />
              <Ligne label="Téléphone" valeur={personne.telephone} />
              <Ligne label="Mobile"    valeur={personne.mobile} />
              <Ligne label="Email"     valeur={personne.email} />
              {!personne.adresse && !personne.telephone && !personne.mobile && !personne.email && (
                <p className="text-sm text-muted-foreground">Aucun contact renseigné.</p>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identité</p>
              <Ligne label="Nationalité"      valeur={personne.nationalite} />
              <Ligne label="Date de naissance" valeur={personne.dateNaissance ? formaterDateCourte(new Date(personne.dateNaissance)) : null} />
              <Ligne label="N° sécurité sociale" valeur={personne.numeroSecu} />
              <Ligne label="Actualisation"    valeur={personne.dateActualisation ? formaterDateCourte(new Date(personne.dateActualisation)) : null} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
