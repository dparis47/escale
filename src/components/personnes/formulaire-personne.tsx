'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Genre, Ressource, SituationFamiliale, OrientePar } from '@prisma/client'
import type { PersonneAvecStats } from '@/types/persons'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  RESSOURCES_OPTIONS,
  SITUATIONS_OPTIONS,
  ORIENTE_PAR_OPTIONS,
  HEBERGEMENT_OPTIONS,
} from '@/schemas/person'
import { formaterDateISO, capitaliserPrenom } from '@/lib/dates'

type Mode = 'creation' | 'edition'

interface Props {
  mode:      Mode
  personne?: PersonneAvecStats
}

function toInputDate(d: Date | null | undefined): string {
  if (!d) return ''
  return formaterDateISO(new Date(d))
}

function SectionTitre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-blue-700">
      {children}
    </h2>
  )
}

function Champ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

function BoolChamp({
  id, label, checked, onChange,
}: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <Label htmlFor={id} className="cursor-pointer font-normal text-sm">{label}</Label>
    </div>
  )
}

export function FormulairePersonne({ mode, personne }: Props) {
  const router = useRouter()

  // ── Identité ───────────────────────────────────────────────
  const [nom,           setNom]           = useState((personne?.nom    ?? '').toUpperCase())
  const [prenom,        setPrenom]        = useState(capitaliserPrenom(personne?.prenom ?? ''))
  const [genre,         setGenre]         = useState<Genre | ''>(personne?.genre ?? '')
  const [dateNaissance, setDateNaissance] = useState(toInputDate(personne?.dateNaissance))
  const [nationalite,   setNationalite]   = useState(personne?.nationalite ?? '')

  // ── Contact ────────────────────────────────────────────────
  const [adresse,           setAdresse]           = useState(personne?.adresse           ?? '')
  const [telephone,         setTelephone]         = useState(personne?.telephone         ?? '')
  const [mobile,            setMobile]            = useState(personne?.mobile            ?? '')
  const [email,             setEmail]             = useState(personne?.email             ?? '')

  // ── Santé ──────────────────────────────────────────────────
  const [css,                 setCss]                 = useState(personne?.css                 ?? false)
  const [rqth,                setRqth]                = useState(personne?.rqth                ?? false)
  const [invalidite,          setInvalidite]          = useState(personne?.invalidite          ?? false)
  const [categorieInvalidite, setCategorieInvalidite] = useState(personne?.categorieInvalidite ?? '')
  const [numeroSecu,          setNumeroSecu]          = useState(personne?.numeroSecu          ?? '')

  // ── France Travail ─────────────────────────────────────────
  const [numeroFT,          setNumeroFT]          = useState(personne?.numeroFT          ?? '')
  const [dateInscriptionFT, setDateInscriptionFT] = useState(toInputDate(personne?.dateInscriptionFT))
  const [codepersonnelFT,   setCodepersonnelFT]   = useState(personne?.codepersonnelFT   ?? '')
  const [accoGlo,           setAccoGlo]           = useState(personne?.accoGlo           ?? false)

  // ── CAF ────────────────────────────────────────────────────
  const [numeroCAF, setNumeroCAF] = useState(personne?.numeroCAF ?? '')

  // ── Situation familiale ────────────────────────────────────
  const [situationFamiliale,  setSituationFamiliale]  = useState<SituationFamiliale | ''>(personne?.situationFamiliale ?? '')
  const [nombreEnfants,       setNombreEnfants]       = useState(personne?.nombreEnfantsCharge ?? 0)
  const [agesEnfants,         setAgesEnfants]         = useState<number[]>(personne?.agesEnfants ?? [])

  // ── Mobilité ───────────────────────────────────────────────
  const [permisConduire,         setPermisConduire]         = useState(personne?.permisConduire         ?? false)
  const [vehiculePersonnel,      setVehiculePersonnel]      = useState(personne?.vehiculePersonnel      ?? false)
  const [autresMoyensLocomotion, setAutresMoyensLocomotion] = useState(personne?.autresMoyensLocomotion ?? '')

  // ── Hébergement ────────────────────────────────────────────
  const [hebergement, setHebergement] = useState(personne?.hebergement ?? '')

  // ── Ressources & Orientation ───────────────────────────────
  const [ressources, setRessources] = useState<Ressource[]>(personne?.ressources ?? [])
  const [orientePar, setOrientePar] = useState<OrientePar | ''>(personne?.orientePar ?? '')
  const [enASID,     setEnASID]     = useState(personne?.enASID ?? false)

  // ── UI State ───────────────────────────────────────────────
  const [erreur,       setErreur]       = useState<string | null>(null)
  const [enChargement, setEnChargement] = useState(false)

  function toggleRessource(r: Ressource) {
    setRessources((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    )
  }

  function ajouterAge() {
    setAgesEnfants((prev) => [...prev, 0])
  }

  function supprimerAge(idx: number) {
    setAgesEnfants((prev) => prev.filter((_, i) => i !== idx))
  }

  function modifierAge(idx: number, val: string) {
    const n = parseInt(val, 10)
    setAgesEnfants((prev) => prev.map((a, i) => (i === idx ? (isNaN(n) ? 0 : Math.min(30, Math.max(0, n))) : a)))
  }

  async function soumettre() {
    if (!nom.trim())   { setErreur('Le nom est requis.'); return }
    if (!prenom.trim()) { setErreur('Le prénom est requis.'); return }
    if (!genre)         { setErreur('Le genre est requis.'); return }

    setErreur(null)
    setEnChargement(true)

    // En édition : null = effacer le champ. En création : undefined = ne pas envoyer.
    const vide = mode === 'edition' ? null : undefined

    try {
      const body = {
        nom:               nom.trim(),
        prenom:            prenom.trim(),
        genre,
        dateNaissance:     dateNaissance     || undefined,
        nationalite:       nationalite       || vide,
        adresse:           adresse           || vide,
        telephone:         telephone         || vide,
        mobile:            mobile            || vide,
        email:             email             || '',
        css,
        rqth,
        invalidite,
        categorieInvalidite: invalidite ? (categorieInvalidite || vide) : vide,
        numeroSecu:          numeroSecu || vide,
        numeroFT:          numeroFT          || vide,
        dateInscriptionFT: dateInscriptionFT || undefined,
        codepersonnelFT:   codepersonnelFT   || vide,
        accoGlo,
        numeroCAF:         numeroCAF         || vide,
        situationFamiliale: situationFamiliale || undefined,
        nombreEnfantsCharge: nombreEnfants > 0 ? nombreEnfants : undefined,
        agesEnfants,
        permisConduire,
        vehiculePersonnel,
        autresMoyensLocomotion: autresMoyensLocomotion || vide,
        hebergement:       hebergement       || vide,
        ressources,
        orientePar:        orientePar        || undefined,
        enASID,
      }

      const url    = mode === 'edition' ? `/api/personnes/${personne!.id}` : '/api/personnes'
      const method = mode === 'edition' ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErreur((data as { erreur?: string }).erreur ?? 'Une erreur est survenue.')
        return
      }

      if (mode === 'creation') {
        const { id } = await res.json() as { id: number }
        router.push(`/personnes/${id}`)
      } else {
        router.push(`/personnes/${personne!.id}`)
        router.refresh()
      }
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <>
      {mode === 'edition' && personne && (
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b bg-background/95 px-4 py-4 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-blue-700">
            {personne.nom.toUpperCase()} {capitaliserPrenom(personne.prenom)}
          </h1>
          <div className="flex items-center gap-2">
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            <Button onClick={soumettre} disabled={enChargement}>
              {enChargement ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </div>
      )}
      <div className={`space-y-8 max-w-2xl${mode === 'edition' ? ' py-6' : ''}`}>

      {/* ── Identité ─────────────────────────────────────── */}
      <section>
        <SectionTitre>Identité</SectionTitre>
        <div className="grid grid-cols-2 gap-4">
          <Champ label="Nom" required>
            <Input value={nom} onChange={(e) => setNom(e.target.value.toUpperCase())} maxLength={100} placeholder="Nom de famille…" />
          </Champ>
          <Champ label="Prénom" required>
            <Input value={prenom} onChange={(e) => setPrenom(capitaliserPrenom(e.target.value))} maxLength={100} placeholder="Prénom…" />
          </Champ>
          <Champ label="Genre" required>
            <Select value={genre} onValueChange={(v) => setGenre(v as Genre)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HOMME">Homme</SelectItem>
                <SelectItem value="FEMME">Femme</SelectItem>
              </SelectContent>
            </Select>
          </Champ>
          <Champ label="Date de naissance">
            <Input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
          </Champ>
          <div className="col-span-2">
            <Champ label="Nationalité">
              <Input value={nationalite} onChange={(e) => setNationalite(e.target.value)} maxLength={100} placeholder="Nationalité…" />
            </Champ>
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────── */}
      <section>
        <SectionTitre>Contact</SectionTitre>
        <div className="space-y-3">
          <Champ label="Adresse">
            <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} maxLength={300} placeholder="Adresse…" />
          </Champ>
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Téléphone">
              <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} maxLength={20} placeholder="0X XX XX XX XX" />
            </Champ>
            <Champ label="Mobile">
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={20} placeholder="06…" />
            </Champ>
          </div>
          <Champ label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} placeholder="email@exemple.fr" />
          </Champ>
        </div>
      </section>

      {/* ── Santé ────────────────────────────────────────── */}
      <section>
        <SectionTitre>Santé</SectionTitre>
        <div className="space-y-3">
          <BoolChamp id="css"  label="CSS"  checked={css}  onChange={setCss} />
          <BoolChamp id="rqth" label="RQTH" checked={rqth} onChange={setRqth} />
          <div>
            <BoolChamp id="invalidite" label="Invalidité" checked={invalidite} onChange={(v) => { setInvalidite(v); if (!v) setCategorieInvalidite('') }} />
            {invalidite && (
              <div className="ml-6 mt-1.5">
                <Champ label="Catégorie">
                  <Input
                    value={categorieInvalidite}
                    onChange={(e) => setCategorieInvalidite(e.target.value)}
                    maxLength={100}
                    placeholder="Catégorie…"
                  />
                </Champ>
              </div>
            )}
          </div>
          <Champ label="N° de sécurité sociale">
            <Input value={numeroSecu} onChange={(e) => setNumeroSecu(e.target.value)} maxLength={50} placeholder="X XX XX XX XXX XXX XX" />
          </Champ>
        </div>
      </section>

      {/* ── France Travail ───────────────────────────────── */}
      <section>
        <SectionTitre>France Travail</SectionTitre>
        <div className="grid grid-cols-2 gap-4">
          <Champ label="N° France Travail">
            <Input value={numeroFT} onChange={(e) => setNumeroFT(e.target.value)} maxLength={50} placeholder="Numéro FT…" />
          </Champ>
          <Champ label="Date d'inscription FT">
            <Input type="date" value={dateInscriptionFT} onChange={(e) => setDateInscriptionFT(e.target.value)} />
          </Champ>
          <Champ label="Code personnel (CP)">
            <Input value={codepersonnelFT} onChange={(e) => setCodepersonnelFT(e.target.value)} maxLength={50} placeholder="Code personnel…" />
          </Champ>
        </div>
        <div className="mt-3">
          <BoolChamp id="accoGlo" label="Accompagnement global France Travail" checked={accoGlo} onChange={setAccoGlo} />
        </div>
      </section>

      {/* ── Situation familiale & mobilité ───────────────── */}
      <section>
        <SectionTitre>Situation familiale &amp; mobilité</SectionTitre>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Champ label="N° CAF">
              <Input value={numeroCAF} onChange={(e) => setNumeroCAF(e.target.value)} maxLength={50} placeholder="N° allocataire…" />
            </Champ>
            <Champ label="Situation familiale">
              <Select value={situationFamiliale} onValueChange={(v) => setSituationFamiliale(v as SituationFamiliale)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {SITUATIONS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Champ>
          </div>

          {/* Enfants */}
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Nombre d'enfants à charge">
              <Input
                type="number"
                min={0}
                value={nombreEnfants === 0 ? '' : nombreEnfants}
                onChange={(e) => setNombreEnfants(Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
              />
            </Champ>
          </div>

          {/* Âges des enfants */}
          <div>
            <Label className="mb-1 block text-sm">Âge(s) des enfants</Label>
            <div className="flex flex-wrap gap-2 items-center">
              {agesEnfants.map((age, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={age}
                    onChange={(e) => modifierAge(idx, e.target.value)}
                    className="w-16 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => supprimerAge(idx)}
                    className="text-sm text-muted-foreground hover:text-destructive"
                    aria-label="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={ajouterAge}>
                + Ajouter
              </Button>
            </div>
          </div>

          {/* Mobilité */}
          <div className="space-y-2">
            <BoolChamp id="permisConduire"    label="Permis de conduire"   checked={permisConduire}    onChange={setPermisConduire} />
            <BoolChamp id="vehiculePersonnel" label="Véhicule personnel"   checked={vehiculePersonnel} onChange={setVehiculePersonnel} />
            <Champ label="Autre(s) moyen(s) de locomotion">
              <Input value={autresMoyensLocomotion} onChange={(e) => setAutresMoyensLocomotion(e.target.value)} maxLength={200} placeholder="Bus, vélo…" />
            </Champ>
          </div>

          <Champ label="Hébergement">
            <Select value={hebergement} onValueChange={setHebergement}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                {HEBERGEMENT_OPTIONS.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Champ>
        </div>
      </section>

      {/* ── Ressources & Orientation ─────────────────────── */}
      <section>
        <SectionTitre>Ressources &amp; orientation</SectionTitre>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm">Ressources</Label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {RESSOURCES_OPTIONS.map((r) => (
                <div key={r.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`ressource-${r.value}`}
                    checked={ressources.includes(r.value as Ressource)}
                    onCheckedChange={() => toggleRessource(r.value as Ressource)}
                  />
                  <Label htmlFor={`ressource-${r.value}`} className="cursor-pointer font-normal text-sm">
                    {r.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Champ label="Orienté(e) par">
            <Select
              value={orientePar}
              onValueChange={(v) => {
                setOrientePar(v as OrientePar)
                if (v !== 'CMS') setEnASID(false)
              }}
            >
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                {ORIENTE_PAR_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Champ>
          {orientePar === 'CMS' && (
            <div className="ml-1">
              <BoolChamp id="enASID" label="Suivi ASID" checked={enASID} onChange={setEnASID} />
            </div>
          )}
        </div>
      </section>

      {/* ── Erreur & boutons (création uniquement) ───────── */}
      {mode === 'creation' && (
        <>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <div className="flex gap-3 pt-2">
            <Button onClick={soumettre} disabled={enChargement}>
              {enChargement ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </>
      )}
      </div>
    </>
  )
}
