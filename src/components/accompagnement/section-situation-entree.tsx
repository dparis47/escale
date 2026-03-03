'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ChevronRight } from 'lucide-react'
import { useRegistrerSauvegarde, useModeEdition } from '@/contexts/sauvegarde-accompagnement'
import { NIVEAUX_FORMATION, NIVEAUX_FORMATION_FR } from '@/schemas/accompagnement'
import type { NiveauFormation } from '@prisma/client'

interface Props {
  accompagnementId: number
  // Ressources
  ressourceRSA:            boolean
  ressourceASS:            boolean
  ressourceARE:            boolean
  ressourceAAH:            boolean
  ressourceASI:            boolean
  ressourceSansRessources: boolean
  // Emploi avant
  avantOccupeEmploi:       boolean
  avantCDI:                boolean
  avantCDDPlus6Mois:       boolean
  avantCDDMoins6Mois:      boolean
  avantInterim:            boolean
  avantIAE:                boolean
  avantIndependant:        boolean
  avantFormationPro:       boolean
  avantEnRechercheEmploi:  boolean
  avantNeCherchePasEmploi: boolean
  // Niveau de formation
  niveauFormation: NiveauFormation | null
  // Reconnaissance handicap
  reconnaissanceHandicap: boolean
  // Logement
  logementSDF:       boolean
  logementExclusion: boolean
}

function BoolChamp({ id, label, checked, onChange, disabled }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(!!v)} disabled={disabled} />
      <Label htmlFor={id} className={`cursor-pointer font-normal text-sm ${disabled ? 'opacity-50' : ''}`}>{label}</Label>
    </div>
  )
}

function SousTitre({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  )
}

export function SectionSituationEntree({
  accompagnementId,
  ressourceRSA:            initRessourceRSA,
  ressourceASS:            initRessourceASS,
  ressourceARE:            initRessourceARE,
  ressourceAAH:            initRessourceAAH,
  ressourceASI:            initRessourceASI,
  ressourceSansRessources: initRessourceSans,
  avantOccupeEmploi:       initAvantOccupe,
  avantCDI:                initAvantCDI,
  avantCDDPlus6Mois:       initAvantCDDp6,
  avantCDDMoins6Mois:      initAvantCDDm6,
  avantInterim:            initAvantInterim,
  avantIAE:                initAvantIAE,
  avantIndependant:        initAvantInd,
  avantFormationPro:       initAvantFP,
  avantEnRechercheEmploi:  initAvantRE,
  avantNeCherchePasEmploi: initAvantNRE,
  niveauFormation:         initNiveau,
  reconnaissanceHandicap:  initHandicap,
  logementSDF:             initSDF,
  logementExclusion:       initExclusion,
}: Props) {
  const router     = useRouter()
  const modeEdition = useModeEdition()
  const [ouvert, setOuvert] = useState(false)

  const [ressourceRSA,            setRessourceRSA]            = useState(initRessourceRSA)
  const [ressourceASS,            setRessourceASS]            = useState(initRessourceASS)
  const [ressourceARE,            setRessourceARE]            = useState(initRessourceARE)
  const [ressourceAAH,            setRessourceAAH]            = useState(initRessourceAAH)
  const [ressourceASI,            setRessourceASI]            = useState(initRessourceASI)
  const [ressourceSansRessources, setRessourceSans]           = useState(initRessourceSans)
  const [avantOccupeEmploi,       setAvantOccupe]             = useState(initAvantOccupe)
  const [avantCDI,                setAvantCDI]                = useState(initAvantCDI)
  const [avantCDDPlus6Mois,       setAvantCDDp6]              = useState(initAvantCDDp6)
  const [avantCDDMoins6Mois,      setAvantCDDm6]              = useState(initAvantCDDm6)
  const [avantInterim,            setAvantInterim]            = useState(initAvantInterim)
  const [avantIAE,                setAvantIAE]                = useState(initAvantIAE)
  const [avantIndependant,        setAvantInd]                = useState(initAvantInd)
  const [avantFormationPro,       setAvantFP]                 = useState(initAvantFP)
  const [avantEnRechercheEmploi,  setAvantRE]                 = useState(initAvantRE)
  const [avantNeCherchePasEmploi, setAvantNRE]                = useState(initAvantNRE)
  const [niveauFormation, setNiveauFormation] = useState<NiveauFormation | ''>(initNiveau ?? '')
  const [reconnaissanceHandicap, setHandicap] = useState(initHandicap)
  const [logementSDF,       setSDF]       = useState(initSDF)
  const [logementExclusion, setExclusion] = useState(initExclusion)
  const [erreur, setErreur] = useState('')

  async function sauvegarder() {
    setErreur('')
    try {
      const res = await fetch(`/api/accompagnement/${accompagnementId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ressourceRSA, ressourceASS, ressourceARE, ressourceAAH, ressourceASI, ressourceSansRessources,
          avantOccupeEmploi,
          avantCDI, avantCDDPlus6Mois, avantCDDMoins6Mois, avantInterim, avantIAE, avantIndependant,
          avantFormationPro, avantEnRechercheEmploi, avantNeCherchePasEmploi,
          niveauFormation: niveauFormation || undefined,
          reconnaissanceHandicap,
          logementSDF, logementExclusion,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { erreur?: string }
        setErreur(data.erreur ?? "Erreur lors de l'enregistrement.")
        throw new Error(data.erreur ?? 'Erreur')
      }
      setErreur('')
      router.refresh()
    } catch (e) {
      if (e instanceof Error && e.message !== 'Erreur') setErreur('Erreur réseau.')
      throw e
    }
  }

  useRegistrerSauvegarde('situation-entree', sauvegarder)

  return (
    <>
      <h2
        onClick={() => setOuvert((o) => !o)}
        className="mb-3 mt-6 flex cursor-pointer select-none items-center gap-2 border-b pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${ouvert ? 'rotate-90' : ''}`} />
        Situation à l&apos;entrée FSE+
      </h2>
      {ouvert && (
        <div className="space-y-5">
          {/* Ressources */}
          <div>
            <SousTitre>Ressources à l&apos;entrée</SousTitre>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <BoolChamp id="ressRSA" label="RSA"            checked={ressourceRSA}            onChange={setRessourceRSA}  disabled={!modeEdition} />
              <BoolChamp id="ressASS" label="ASS"            checked={ressourceASS}            onChange={setRessourceASS}  disabled={!modeEdition} />
              <BoolChamp id="ressARE" label="ARE"            checked={ressourceARE}            onChange={setRessourceARE}  disabled={!modeEdition} />
              <BoolChamp id="ressAAH" label="AAH"            checked={ressourceAAH}            onChange={setRessourceAAH}  disabled={!modeEdition} />
              <BoolChamp id="ressASI" label="ASI"            checked={ressourceASI}            onChange={setRessourceASI}  disabled={!modeEdition} />
              <BoolChamp id="resSans" label="Sans ressource" checked={ressourceSansRessources} onChange={setRessourceSans} disabled={!modeEdition} />
            </div>
          </div>

          {/* Emploi avant */}
          <div>
            <SousTitre>Situation emploi à l&apos;entrée dans le FSE+</SousTitre>
            <div className="mb-3 flex items-center gap-6">
              <Label className="text-sm w-36 shrink-0">Occupe un emploi</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Checkbox id="avOccupeOui" checked={avantOccupeEmploi}  onCheckedChange={(v) => setAvantOccupe(!!v)} disabled={!modeEdition} />
                  <Label htmlFor="avOccupeOui" className="cursor-pointer font-normal text-sm">Oui</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox id="avOccupeNon" checked={!avantOccupeEmploi} onCheckedChange={(v) => setAvantOccupe(!v)} disabled={!modeEdition} />
                  <Label htmlFor="avOccupeNon" className="cursor-pointer font-normal text-sm">Non</Label>
                </div>
              </div>
            </div>
            {avantOccupeEmploi ? (
              <div className="pl-4 border-l-2 border-muted grid grid-cols-2 gap-2">
                <BoolChamp id="avInd"   label="Travailleur indépendant" checked={avantIndependant}   onChange={setAvantInd}   disabled={!modeEdition} />
                <BoolChamp id="avCDI"   label="CDI"                     checked={avantCDI}           onChange={setAvantCDI}   disabled={!modeEdition} />
                <BoolChamp id="avCDDp6" label="CDD > 6 mois"            checked={avantCDDPlus6Mois}  onChange={setAvantCDDp6} disabled={!modeEdition} />
                <BoolChamp id="avCDDm6" label="CDD ≤ 6 mois"            checked={avantCDDMoins6Mois} onChange={setAvantCDDm6} disabled={!modeEdition} />
                <BoolChamp id="avInt"   label="Intérim"                 checked={avantInterim}       onChange={setAvantInterim} disabled={!modeEdition} />
                <BoolChamp id="avIAE"   label="IAE"                     checked={avantIAE}           onChange={setAvantIAE}   disabled={!modeEdition} />
              </div>
            ) : (
              <div className="pl-4 border-l-2 border-muted grid grid-cols-1 gap-2 sm:grid-cols-2">
                <BoolChamp id="avFP"  label="Formation professionnelle"           checked={avantFormationPro}       onChange={setAvantFP}  disabled={!modeEdition} />
                <BoolChamp id="avRE"  label="En recherche d'emploi"              checked={avantEnRechercheEmploi}  onChange={setAvantRE}  disabled={!modeEdition} />
                <BoolChamp id="avNRE" label="Ne recherche pas un emploi immédiat" checked={avantNeCherchePasEmploi} onChange={setAvantNRE} disabled={!modeEdition} />
              </div>
            )}
          </div>

          {/* Niveau de formation */}
          <div>
            <SousTitre>Niveau de formation</SousTitre>
            <div className="flex flex-wrap gap-2">
              {NIVEAUX_FORMATION.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { if (modeEdition) setNiveauFormation(niveauFormation === n ? '' : n) }}
                  disabled={!modeEdition}
                  className={[
                    'rounded-full px-3 py-1 text-xs transition-colors border',
                    niveauFormation === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground hover:text-foreground border-transparent',
                    !modeEdition ? 'opacity-50 cursor-default' : '',
                  ].join(' ')}
                >
                  {NIVEAUX_FORMATION_FR[n]}
                </button>
              ))}
            </div>
          </div>

          {/* Reconnaissance handicap */}
          <div>
            <SousTitre>Reconnaissance handicap</SousTitre>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <Checkbox id="handOui" checked={reconnaissanceHandicap}  onCheckedChange={(v) => setHandicap(!!v)} disabled={!modeEdition} />
                <Label htmlFor="handOui" className="cursor-pointer font-normal text-sm">Oui</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox id="handNon" checked={!reconnaissanceHandicap} onCheckedChange={(v) => setHandicap(!v)} disabled={!modeEdition} />
                <Label htmlFor="handNon" className="cursor-pointer font-normal text-sm">Non</Label>
              </div>
            </div>
          </div>

          {/* Logement */}
          <div>
            <SousTitre>Situation logement à l&apos;entrée</SousTitre>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-6">
                <Label className="text-sm w-24 shrink-0">SDF</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="sdfOui" checked={logementSDF}  onCheckedChange={(v) => setSDF(!!v)} disabled={!modeEdition} />
                    <Label htmlFor="sdfOui" className="cursor-pointer font-normal text-sm">Oui</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="sdfNon" checked={!logementSDF} onCheckedChange={(v) => setSDF(!v)} disabled={!modeEdition} />
                    <Label htmlFor="sdfNon" className="cursor-pointer font-normal text-sm">Non</Label>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Label className="text-sm w-24 shrink-0">Exclusion du logement</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="exclOui" checked={logementExclusion}  onCheckedChange={(v) => setExclusion(!!v)} disabled={!modeEdition} />
                    <Label htmlFor="exclOui" className="cursor-pointer font-normal text-sm">Oui</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="exclNon" checked={!logementExclusion} onCheckedChange={(v) => setExclusion(!v)} disabled={!modeEdition} />
                    <Label htmlFor="exclNon" className="cursor-pointer font-normal text-sm">Non</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        </div>
      )}
    </>
  )
}
