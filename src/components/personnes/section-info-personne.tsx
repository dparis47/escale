'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Genre, Ressource, SituationFamiliale, OrientePar } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  RESSOURCES_OPTIONS,
  SITUATIONS_OPTIONS,
  ORIENTE_PAR_OPTIONS,
  HEBERGEMENT_OPTIONS,
  SITUATIONS_FR,
  RESSOURCES_FR,
  ORIENTE_PAR_FR,
} from '@/schemas/person'
import { formaterDateISO, formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { formaterTelephone, formaterNumeroSecu } from '@/lib/format'
import { useModeEdition, useRegistrerSauvegarde } from '@/contexts/sauvegarde-accompagnement'

// ── Types ────────────────────────────────────────────────────────────────────

interface PersonneInfo {
  id: number
  nom: string
  prenom: string
  genre: Genre
  dateNaissance: Date | null
  nationalite: string | null
  adresse: string | null
  telephone: string | null
  mobile: string | null
  email: string | null
  dateActualisation: Date | null
  css: boolean
  rqth: boolean
  invalidite: boolean
  categorieInvalidite: string | null
  numeroSecu: string | null
  numeroFT: string | null
  dateInscriptionFT: Date | null
  codepersonnelFT: string | null
  accoGlo: boolean
  numeroCAF: string | null
  situationFamiliale: SituationFamiliale | null
  nombreEnfantsCharge: number | null
  agesEnfants: number[]
  permisConduire: boolean
  vehiculePersonnel: boolean
  autresMoyensLocomotion: string | null
  hebergement: string | null
  ressources: Ressource[]
  orientePar: OrientePar | null
  enASID: boolean
}

interface Props {
  personne: PersonneInfo
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toInputDate(d: Date | null | undefined): string {
  if (!d) return ''
  return formaterDateISO(new Date(d))
}

function SectionTitre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-6 rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-blue-700">
      {children}
    </h2>
  )
}

function Ligne({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  const vide = !valeur && valeur !== 0 && valeur !== false
  return (
    <div className="flex gap-2 py-0.5 text-sm">
      <span className="w-48 shrink-0 text-muted-foreground">{label}</span>
      <span className={vide ? 'text-muted-foreground/50' : ''}>{vide ? '—' : valeur}</span>
    </div>
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

// ── Composant principal ──────────────────────────────────────────────────────

export function SectionInfoPersonne({ personne }: Props) {
  const router = useRouter()
  const modeEdition = useModeEdition()

  // ── State pour l'édition ──────────────────────────────────────
  const [nom,           setNom]           = useState(personne.nom.toUpperCase())
  const [prenom,        setPrenom]        = useState(capitaliserPrenom(personne.prenom))
  const [genre,         setGenre]         = useState<Genre | ''>(personne.genre)
  const [dateNaissance, setDateNaissance] = useState(toInputDate(personne.dateNaissance))
  const [nationalite,   setNationalite]   = useState(personne.nationalite ?? '')

  const [adresse,           setAdresse]           = useState(personne.adresse           ?? '')
  const [telephone,         setTelephone]         = useState(formaterTelephone(personne.telephone) ?? '')
  const [mobile,            setMobile]            = useState(formaterTelephone(personne.mobile)    ?? '')
  const [email,             setEmail]             = useState(personne.email             ?? '')

  const [css,                 setCss]                 = useState(personne.css)
  const [rqth,                setRqth]                = useState(personne.rqth)
  const [invalidite,          setInvalidite]          = useState(personne.invalidite)
  const [categorieInvalidite, setCategorieInvalidite] = useState(personne.categorieInvalidite ?? '')
  const [numeroSecu,          setNumeroSecu]          = useState(formaterNumeroSecu(personne.numeroSecu) ?? '')

  const [numeroFT,          setNumeroFT]          = useState(personne.numeroFT          ?? '')
  const [dateInscriptionFT, setDateInscriptionFT] = useState(toInputDate(personne.dateInscriptionFT))
  const [codepersonnelFT,   setCodepersonnelFT]   = useState(personne.codepersonnelFT   ?? '')
  const [accoGlo,           setAccoGlo]           = useState(personne.accoGlo)

  const [numeroCAF,           setNumeroCAF]           = useState(personne.numeroCAF ?? '')
  const [situationFamiliale,  setSituationFamiliale]  = useState<SituationFamiliale | ''>(personne.situationFamiliale ?? '')
  const [nombreEnfants,       setNombreEnfants]       = useState(personne.nombreEnfantsCharge ?? 0)
  const [agesEnfants,         setAgesEnfants]         = useState<number[]>(personne.agesEnfants)

  const [permisConduire,         setPermisConduire]         = useState(personne.permisConduire)
  const [vehiculePersonnel,      setVehiculePersonnel]      = useState(personne.vehiculePersonnel)
  const [autresMoyensLocomotion, setAutresMoyensLocomotion] = useState(personne.autresMoyensLocomotion ?? '')
  const [hebergement,            setHebergement]            = useState(personne.hebergement ?? '')

  const [ressources, setRessources] = useState<Ressource[]>(personne.ressources)
  const [orientePar, setOrientePar] = useState<OrientePar | ''>(personne.orientePar ?? '')
  const [enASID,     setEnASID]     = useState(personne.enASID)

  const [erreur, setErreur] = useState<string | null>(null)

  // Réinitialiser les champs quand on quitte le mode édition (annulation)
  useEffect(() => {
    if (!modeEdition) {
      setNom(personne.nom.toUpperCase())
      setPrenom(capitaliserPrenom(personne.prenom))
      setGenre(personne.genre)
      setDateNaissance(toInputDate(personne.dateNaissance))
      setNationalite(personne.nationalite ?? '')
      setAdresse(personne.adresse ?? '')
      setTelephone(formaterTelephone(personne.telephone) ?? '')
      setMobile(formaterTelephone(personne.mobile) ?? '')
      setEmail(personne.email ?? '')
      setCss(personne.css)
      setRqth(personne.rqth)
      setInvalidite(personne.invalidite)
      setCategorieInvalidite(personne.categorieInvalidite ?? '')
      setNumeroSecu(formaterNumeroSecu(personne.numeroSecu) ?? '')
      setNumeroFT(personne.numeroFT ?? '')
      setDateInscriptionFT(toInputDate(personne.dateInscriptionFT))
      setCodepersonnelFT(personne.codepersonnelFT ?? '')
      setAccoGlo(personne.accoGlo)
      setNumeroCAF(personne.numeroCAF ?? '')
      setSituationFamiliale(personne.situationFamiliale ?? '')
      setNombreEnfants(personne.nombreEnfantsCharge ?? 0)
      setAgesEnfants(personne.agesEnfants)
      setPermisConduire(personne.permisConduire)
      setVehiculePersonnel(personne.vehiculePersonnel)
      setAutresMoyensLocomotion(personne.autresMoyensLocomotion ?? '')
      setHebergement(personne.hebergement ?? '')
      setRessources(personne.ressources)
      setOrientePar(personne.orientePar ?? '')
      setEnASID(personne.enASID)
      setErreur(null)
    }
  }, [modeEdition, personne])

  // ── Helpers édition ──────────────────────────────────────────
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

  // ── Sauvegarde ───────────────────────────────────────────────
  async function enregistrer() {
    if (!nom.trim())    throw new Error('Le nom est requis.')
    if (!prenom.trim()) throw new Error('Le prénom est requis.')
    if (!genre)         throw new Error('Le genre est requis.')

    const body = {
      nom:               nom.trim(),
      prenom:            prenom.trim(),
      genre,
      dateNaissance:     dateNaissance     || undefined,
      nationalite:       nationalite       || null,
      adresse:           adresse           || null,
      telephone:         telephone         || null,
      mobile:            mobile            || null,
      email:             email             || '',
      css,
      rqth,
      invalidite,
      categorieInvalidite: invalidite ? (categorieInvalidite || null) : null,
      numeroSecu:          numeroSecu || null,
      numeroFT:          numeroFT          || null,
      dateInscriptionFT: dateInscriptionFT || undefined,
      codepersonnelFT:   codepersonnelFT   || null,
      accoGlo,
      numeroCAF:         numeroCAF         || null,
      situationFamiliale: situationFamiliale || undefined,
      nombreEnfantsCharge: nombreEnfants > 0 ? nombreEnfants : undefined,
      agesEnfants,
      permisConduire,
      vehiculePersonnel,
      autresMoyensLocomotion: autresMoyensLocomotion || null,
      hebergement:       hebergement       || null,
      ressources,
      orientePar:        orientePar        || undefined,
      enASID,
    }

    const res = await fetch(`/api/personnes/${personne.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { erreur?: string }).erreur ?? 'Erreur lors de la sauvegarde.')
    }

    setErreur(null)
    router.refresh()
  }

  useRegistrerSauvegarde('info-personne', enregistrer)

  // ── Mode lecture ─────────────────────────────────────────────
  if (!modeEdition) {
    return (
      <>
        {/* Identité */}
        <SectionTitre>Identité</SectionTitre>
        <Ligne label="Nom"               valeur={personne.nom.toUpperCase()} />
        <Ligne label="Prénom"            valeur={capitaliserPrenom(personne.prenom)} />
        <Ligne label="Genre"             valeur={personne.genre === 'HOMME' ? 'Homme' : 'Femme'} />
        <Ligne label="Date de naissance" valeur={personne.dateNaissance ? formaterDateCourte(personne.dateNaissance) : null} />
        <Ligne label="Nationalité"       valeur={personne.nationalite} />

        {/* Contact */}
        <SectionTitre>Contact</SectionTitre>
        <Ligne label="Adresse"             valeur={personne.adresse} />
        <Ligne label="Mobile"              valeur={formaterTelephone(personne.mobile)} />
        <Ligne label="Téléphone"           valeur={formaterTelephone(personne.telephone)} />
        <Ligne label="Email"               valeur={personne.email} />

        {/* Santé */}
        <SectionTitre>Santé</SectionTitre>
        <Ligne label="CSS"                    valeur={personne.css ? 'Oui' : null} />
        <Ligne label="RQTH"                   valeur={personne.rqth ? 'Oui' : null} />
        <Ligne label="Invalidité"             valeur={personne.invalidite ? 'Oui' : null} />
        {personne.invalidite && (
          <Ligne label="Catégorie invalidité" valeur={personne.categorieInvalidite} />
        )}
        <Ligne label="N° de sécurité sociale" valeur={formaterNumeroSecu(personne.numeroSecu)} />

        {/* France Travail */}
        <SectionTitre>France Travail</SectionTitre>
        <Ligne label="N° France Travail"     valeur={personne.numeroFT} />
        <Ligne label="Date d'inscription FT" valeur={personne.dateInscriptionFT ? formaterDateCourte(personne.dateInscriptionFT) : null} />
        <Ligne label="Code personnel (CP)"   valeur={personne.codepersonnelFT} />
        <Ligne label="Accompagnement global FT" valeur={personne.accoGlo ? 'Oui' : null} />

        {/* Situation familiale */}
        <SectionTitre>Situation familiale</SectionTitre>
        <Ligne label="N° CAF"               valeur={personne.numeroCAF} />
        <Ligne label="Situation familiale"  valeur={personne.situationFamiliale ? SITUATIONS_FR[personne.situationFamiliale] : null} />
        <Ligne label="Enfants à charge"     valeur={personne.nombreEnfantsCharge} />
        {personne.agesEnfants.length > 0 && (
          <Ligne label="Âges des enfants" valeur={personne.agesEnfants.join(', ') + ' ans'} />
        )}

        {/* Mobilité & hébergement */}
        <SectionTitre>Mobilité &amp; hébergement</SectionTitre>
        <Ligne label="Permis de conduire"  valeur={personne.permisConduire ? 'Oui' : null} />
        <Ligne label="Véhicule personnel"  valeur={personne.vehiculePersonnel ? 'Oui' : null} />
        <Ligne label="Autre(s) locomotion" valeur={personne.autresMoyensLocomotion} />
        <Ligne label="Hébergement"         valeur={personne.hebergement} />

        {/* Ressources & orientation */}
        <SectionTitre>Ressources &amp; orientation</SectionTitre>
        {personne.ressources.length > 0 ? (
          <Ligne
            label="Ressources"
            valeur={personne.ressources.map((r) => RESSOURCES_FR[r]).join(', ')}
          />
        ) : (
          <Ligne label="Ressources" valeur="Non renseignées" />
        )}
        <Ligne
          label="Orienté(e) par"
          valeur={personne.orientePar ? ORIENTE_PAR_FR[personne.orientePar] : null}
        />
      </>
    )
  }

  // ── Mode édition ─────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-2xl">
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}

      {/* Identité */}
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
            <Input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className="w-full" />
          </Champ>
          <div className="col-span-2">
            <Champ label="Nationalité">
              <Input value={nationalite} onChange={(e) => setNationalite(e.target.value)} maxLength={100} placeholder="Nationalité…" />
            </Champ>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section>
        <SectionTitre>Contact</SectionTitre>
        <div className="space-y-3">
          <Champ label="Adresse">
            <Textarea value={adresse} onChange={(e) => setAdresse(e.target.value)} maxLength={300} placeholder="Adresse…" rows={2} className="resize-y" />
          </Champ>
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Mobile">
              <Input value={mobile} onChange={(e) => setMobile(formaterTelephone(e.target.value) ?? '')} maxLength={14} placeholder="06 12 34 56 78" />
            </Champ>
            <Champ label="Téléphone">
              <Input value={telephone} onChange={(e) => setTelephone(formaterTelephone(e.target.value) ?? '')} maxLength={14} placeholder="05 12 34 56 78" />
            </Champ>
          </div>
          <Champ label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} placeholder="email@exemple.fr" />
          </Champ>
        </div>
      </section>

      {/* Santé */}
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
            <Input value={numeroSecu} onChange={(e) => setNumeroSecu(formaterNumeroSecu(e.target.value) ?? '')} maxLength={21} placeholder="1 85 05 78 006 084 36" />
          </Champ>
        </div>
      </section>

      {/* France Travail */}
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

      {/* Situation familiale */}
      <section>
        <SectionTitre>Situation familiale</SectionTitre>
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
                value={!nombreEnfants ? '' : nombreEnfants}
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
        </div>
      </section>

      {/* Mobilité & hébergement */}
      <section>
        <SectionTitre>Mobilité &amp; hébergement</SectionTitre>
        <div className="space-y-3">
          <BoolChamp id="permisConduire"    label="Permis de conduire"   checked={permisConduire}    onChange={setPermisConduire} />
          <BoolChamp id="vehiculePersonnel" label="Véhicule personnel"   checked={vehiculePersonnel} onChange={setVehiculePersonnel} />
          <Champ label="Autre(s) moyen(s) de locomotion">
            <Input value={autresMoyensLocomotion} onChange={(e) => setAutresMoyensLocomotion(e.target.value)} maxLength={200} placeholder="Bus, vélo…" />
          </Champ>
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

      {/* Ressources & Orientation */}
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
        </div>
      </section>
    </div>
  )
}
