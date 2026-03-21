'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Genre } from '@prisma/client'
import type { VisiteAvecRelations } from '@/types/visits'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RecherchePersonne } from './recherche-personne'
import { SectionMotifs } from './section-motifs'
import { DEMARCHE_VIDE, fromPrisma, type DemarcheChamps } from '@/lib/demarches'
import { capitaliserPrenom, dateAujourdhui } from '@/lib/dates'

type Mode = 'creation' | 'edition'

interface Props {
  dateISO: string
  mode:    Mode
  visite?: VisiteAvecRelations
}

export function FormulaireVisite({ dateISO, mode, visite }: Props) {
  const router = useRouter()
  const visiteSansFiche = visite ? visite.person.estInscrit === false : false
  const [ouvert, setOuvert]             = useState(false)
  const [estSansFiche, setEstSansFiche] = useState(visiteSansFiche)
  const [genre, setGenre]               = useState<Genre | ''>(visite?.person?.genre ?? '')
  const [personId, setPersonId]         = useState<number | null>(visite?.personId ?? null)
  const [nomPersonne, setNomPersonne]   = useState(
    visite?.person && visite.person.estInscrit
      ? `${capitaliserPrenom(visite.person.prenom)} ${visite.person.nom.toUpperCase()}`
      : ''
  )
  const [nomLibre, setNomLibre]         = useState(
    visiteSansFiche ? (visite?.person?.nom ?? '') : ''
  )
  const [prenomLibre, setPrenomLibre]   = useState(
    visiteSansFiche ? (visite?.person?.prenom ?? '') : ''
  )
  const [orienteParFT, setOrienteParFT] = useState(visite?.orienteParFT ?? false)
  const [fse,          setFse]          = useState(visite?.fse ?? false)
  const [commentaire, setCommentaire]   = useState(visite?.commentaire ?? '')
  const [demarches, setDemarches]       = useState<DemarcheChamps>(() => {
    const base = visite?.demarches
      ? fromPrisma(visite.demarches as unknown as Record<string, unknown>)
      : { ...DEMARCHE_VIDE }
    const themeAtelierIds = (visite?.ateliers ?? []).map((a) => a.actionCollective.themeId)
    return { ...base, themeAtelierIds, atelierParticipation: themeAtelierIds.length > 0 || base.atelierParticipation }
  })

  const [dateVisite, setDateVisite]     = useState(
    visite ? visite.date.toISOString().slice(0, 10) : dateISO
  )
  const [erreur, setErreur]             = useState<string | null>(null)
  const [enChargement, setEnChargement] = useState(false)

  // Autocomplete sans-fiche
  const [suggestionsSF,  setSuggestionsSF]  = useState<{ nom: string; prenom: string | null }[]>([])
  const [afficherSF,     setAfficherSF]     = useState(false)
  const debounceNomRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!estSansFiche || nomLibre.trim().length < 2) { setSuggestionsSF([]); return }
    if (debounceNomRef.current) clearTimeout(debounceNomRef.current)
    debounceNomRef.current = setTimeout(async () => {
      const res = await fetch(`/api/visites/noms-sans-fiche?q=${encodeURIComponent(nomLibre.trim())}`)
      if (res.ok) setSuggestionsSF(await res.json() as { nom: string; prenom: string | null }[])
    }, 300)
    return () => { if (debounceNomRef.current) clearTimeout(debounceNomRef.current) }
  }, [nomLibre, estSansFiche])

  function selectionnerSansFiche(s: { nom: string; prenom: string | null }) {
    setNomLibre(s.nom)
    setPrenomLibre(s.prenom ?? '')
    setSuggestionsSF([])
    setAfficherSF(false)
  }

  function ouvrir() {
    if (mode === 'creation') {
      setEstSansFiche(false)
      setGenre('')
      setPersonId(null)
      setNomPersonne('')
      setNomLibre('')
      setPrenomLibre('')
      setOrienteParFT(false)
      setFse(false)
      setCommentaire('')
      setDemarches(DEMARCHE_VIDE)
    }
    setErreur(null)
    setOuvert(true)
  }

  function basculerSansFiche() {
    setEstSansFiche(true)
    setPersonId(null)
    setNomPersonne('')
    setGenre('')
  }

  function basculerAvecFiche() {
    setEstSansFiche(false)
    setNomLibre('')
    setPrenomLibre('')
  }

  async function soumettre() {
    if (!genre) { setErreur('Le genre est requis.'); return }
    if (!estSansFiche && !personId) { setErreur('Veuillez sélectionner une personne ou passer en saisie libre.'); return }

    setErreur(null)
    setEnChargement(true)

    try {
      const url    = mode === 'edition' ? `/api/visites/${visite!.id}` : '/api/visites'
      const method = mode === 'edition' ? 'PATCH' : 'POST'

      const body = mode === 'creation'
        ? {
            date:        dateISO,
            genre,
            personId:    estSansFiche ? undefined : personId,
            nom:         estSansFiche ? (nomLibre || undefined) : undefined,
            prenom:      estSansFiche ? (prenomLibre || undefined) : undefined,
            orienteParFT,
            fse,
            commentaire: commentaire || undefined,
            demarches,
          }
        : {
            date: dateVisite,
            genre,
            ...(estSansFiche
              ? { nom: nomLibre || null, prenom: prenomLibre || null }
              : {}),
            orienteParFT,
            fse,
            commentaire: commentaire || null,
            demarches,
          }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (res.status === 409) {
        setErreur('Cette personne a déjà une visite enregistrée ce jour.')
        return
      }
      if (!res.ok) {
        setErreur('Une erreur est survenue. Veuillez réessayer.')
        return
      }

      setOuvert(false)
      router.refresh()
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <>
      {mode === 'creation' ? (
        <Button onClick={ouvrir}>+ Ajouter une visite</Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={ouvrir} title="Modifier la visite" aria-label="Modifier">
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === 'creation' ? 'Nouvelle visite' : 'Modifier la visite'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Date de la visite (édition uniquement) */}
            {mode === 'edition' && (
              <div className="space-y-1">
                <Label htmlFor="dateVisite">Date de la visite</Label>
                <Input
                  id="dateVisite"
                  type="date"
                  value={dateVisite}
                  max={dateAujourdhui()}
                  onChange={(e) => setDateVisite(e.target.value)}
                />
              </div>
            )}

            {/* Personne ou nom libre */}
            {!estSansFiche ? (
              <div className="space-y-1">
                <Label>Personne</Label>
                <RecherchePersonne
                  valeurInitiale={nomPersonne}
                  onSelect={(p) => {
                    setPersonId(p.id)
                    setNomPersonne(`${capitaliserPrenom(p.prenom)} ${p.nom.toUpperCase()}`)
                    setGenre(p.genre)
                  }}
                />
                <button
                  type="button"
                  onClick={basculerSansFiche}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Personne introuvable ? <span className="font-bold">Ajouter une personne</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="prenomLibre">Prénom</Label>
                    <Input
                      id="prenomLibre"
                      value={prenomLibre}
                      onChange={(e) => setPrenomLibre(e.target.value)}
                      placeholder="Prénom…"
                      maxLength={100}
                    />
                  </div>
                  <div className="relative space-y-1">
                    <Label htmlFor="nomLibre">Nom</Label>
                    <Input
                      id="nomLibre"
                      value={nomLibre}
                      onChange={(e) => { setNomLibre(e.target.value); setAfficherSF(true) }}
                      onFocus={() => setAfficherSF(true)}
                      onBlur={() => setTimeout(() => setAfficherSF(false), 150)}
                      placeholder="Nom…"
                      maxLength={100}
                      autoComplete="off"
                    />
                    {afficherSF && suggestionsSF.length > 0 && (
                      <ul className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-md">
                        {suggestionsSF.map((s, i) => (
                          <li
                            key={i}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-muted"
                            onMouseDown={() => selectionnerSansFiche(s)}
                          >
                            {s.nom.toUpperCase()}{s.prenom ? ` ${capitaliserPrenom(s.prenom)}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {mode === 'creation' && (
                  <button
                    type="button"
                    onClick={basculerAvecFiche}
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    ← Rechercher dans les fiches
                  </button>
                )}
              </div>
            )}

            {/* Genre */}
            <div className="space-y-2">
              <Label htmlFor="genre">Genre *</Label>
              <Select value={genre} onValueChange={(v) => setGenre(v as Genre)}>
                <SelectTrigger id="genre">
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOMME">Homme</SelectItem>
                  <SelectItem value="FEMME">Femme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orienté par FT + FSE */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="orienteParFT"
                checked={orienteParFT}
                onCheckedChange={(v) => setOrienteParFT(!!v)}
              />
              <Label htmlFor="orienteParFT" className="cursor-pointer font-normal">
                Orienté·e par France Travail
              </Label>
            </div>

            {/* Démarches */}
            <div className="space-y-2">
              <Label>Démarches</Label>
              <SectionMotifs demarches={demarches} onDemarchesChange={setDemarches} dateISO={dateVisite} />
            </div>

            {/* Commentaire */}
            <div className="space-y-2">
              <Label htmlFor="commentaire">Commentaire</Label>
              <Textarea
                id="commentaire"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Remarques éventuelles…"
                rows={3}
                maxLength={500}
              />
            </div>

            {erreur && <p className="text-sm text-destructive">{erreur}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <Button onClick={soumettre} disabled={enChargement}>
                {enChargement ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
