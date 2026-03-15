'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronRight } from 'lucide-react'
import { useRegistrerSauvegarde, useModeEdition } from '@/contexts/sauvegarde-accompagnement'
import type { AccompagnementSortie } from '@prisma/client'

interface Props {
  accompagnementId: number
  sortie:           AccompagnementSortie | null
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

export function SectionSortieFSE({ accompagnementId, sortie }: Props) {
  const router     = useRouter()
  const modeEdition = useModeEdition()
  const [ouvert, setOuvert] = useState(false)

  const [sortieCDDMoins6Mois,        setSortieCDDm6]     = useState(sortie?.sortieCDDMoins6Mois        ?? false)
  const [sortieCDDPlus6Mois,         setSortieCDDp6]     = useState(sortie?.sortieCDDPlus6Mois         ?? false)
  const [sortieCDI,                  setSortieCDI]       = useState(sortie?.sortieCDI                  ?? false)
  const [sortieIAE,                  setSortieIAE]       = useState(sortie?.sortieIAE                  ?? false)
  const [sortieInterim,              setSortieInterim]   = useState(sortie?.sortieInterim              ?? false)
  const [sortieIndependant,          setSortieInd]       = useState(sortie?.sortieIndependant          ?? false)
  const [sortieMaintienEmploi,       setSortieMaint]     = useState(sortie?.sortieMaintienEmploi       ?? false)
  const [sortieRechercheEmploi,      setSortieRE]        = useState(sortie?.sortieRechercheEmploi      ?? false)
  const [sortieInactif,              setSortieInactif]   = useState(sortie?.sortieInactif              ?? false)
  const [sortieFormation,            setSortieFormation] = useState(sortie?.sortieFormation            ?? false)
  const [sortieCreationEntreprise,   setSortieCreat]     = useState(sortie?.sortieCreationEntreprise   ?? false)
  const [sortieInfoContratHorsDelai, setSortieInfo]      = useState(sortie?.sortieInfoContratHorsDelai ?? false)
  const [formationIntitule,          setFormationIntit]  = useState(sortie?.formationIntitule          ?? '')
  const [formationOrganisme,         setFormationOrga]   = useState(sortie?.formationOrganisme         ?? '')
  const [formationVille,             setFormationVille]  = useState(sortie?.formationVille             ?? '')
  const [formationDuree,             setFormationDuree]  = useState(sortie?.formationDuree             ?? '')
  const [erreur, setErreur] = useState('')

  async function sauvegarder() {
    setErreur('')
    try {
      const res = await fetch(`/api/accompagnement/${accompagnementId}/sortie`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sortieCDDMoins6Mois, sortieCDDPlus6Mois, sortieCDI, sortieIAE, sortieInterim,
          sortieIndependant, sortieMaintienEmploi, sortieRechercheEmploi, sortieInactif,
          sortieFormation, sortieCreationEntreprise, sortieInfoContratHorsDelai,
          formationIntitule:  sortieFormation ? (formationIntitule  || undefined) : undefined,
          formationOrganisme: sortieFormation ? (formationOrganisme || undefined) : undefined,
          formationVille:     sortieFormation ? (formationVille     || undefined) : undefined,
          formationDuree:     sortieFormation ? (formationDuree     || undefined) : undefined,
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

  useRegistrerSauvegarde('sortie-fse', sauvegarder)

  return (
    <>
      <h2
        onClick={() => setOuvert((o) => !o)}
        className="mb-3 mt-6 flex cursor-pointer select-none items-center gap-2 rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-blue-700 hover:text-blue-800"
      >
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${ouvert ? 'rotate-90' : ''}`} />
        Situation de sortie
      </h2>
      {ouvert && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <BoolChamp id="sCDDm6" label="CDD ≤ 6 mois"            checked={sortieCDDMoins6Mois}        onChange={setSortieCDDm6}   disabled={!modeEdition} />
            <BoolChamp id="sCDDp6" label="CDD > 6 mois"            checked={sortieCDDPlus6Mois}         onChange={setSortieCDDp6}   disabled={!modeEdition} />
            <BoolChamp id="sCDI"   label="CDI"                      checked={sortieCDI}                  onChange={setSortieCDI}     disabled={!modeEdition} />
            <BoolChamp id="sIAE"   label="IAE"                      checked={sortieIAE}                  onChange={setSortieIAE}     disabled={!modeEdition} />
            <BoolChamp id="sInt"   label="Intérim"                  checked={sortieInterim}              onChange={setSortieInterim} disabled={!modeEdition} />
            <BoolChamp id="sInd"   label="Indépendant(e)"           checked={sortieIndependant}          onChange={setSortieInd}     disabled={!modeEdition} />
            <BoolChamp id="sMaint" label="Maintien en emploi"       checked={sortieMaintienEmploi}       onChange={setSortieMaint}   disabled={!modeEdition} />
            <BoolChamp id="sRE"    label="Recherche d'emploi"       checked={sortieRechercheEmploi}      onChange={setSortieRE}      disabled={!modeEdition} />
            <BoolChamp id="sInact" label="Inactif(ve)"              checked={sortieInactif}              onChange={setSortieInactif} disabled={!modeEdition} />
            <BoolChamp id="sForm"  label="Formation"                checked={sortieFormation}            onChange={setSortieFormation} disabled={!modeEdition} />
            <BoolChamp id="sCreat" label="Création d'entreprise"    checked={sortieCreationEntreprise}   onChange={setSortieCreat}   disabled={!modeEdition} />
            <BoolChamp id="sInfo"  label="Info. contrat hors délai" checked={sortieInfoContratHorsDelai} onChange={setSortieInfo}    disabled={!modeEdition} />
          </div>
          {sortieFormation && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 pl-4 border-l-2 border-muted">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Intitulé</Label>
                <Input value={formationIntitule} onChange={(e) => setFormationIntit(e.target.value)} className="h-8 text-sm" maxLength={200} disabled={!modeEdition} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Organisme</Label>
                <Input value={formationOrganisme} onChange={(e) => setFormationOrga(e.target.value)} className="h-8 text-sm" maxLength={200} disabled={!modeEdition} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ville</Label>
                <Input value={formationVille} onChange={(e) => setFormationVille(e.target.value)} className="h-8 text-sm" maxLength={100} disabled={!modeEdition} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Durée</Label>
                <Input value={formationDuree} onChange={(e) => setFormationDuree(e.target.value)} className="h-8 text-sm" maxLength={100} placeholder="ex: 6 mois" disabled={!modeEdition} />
              </div>
            </div>
          )}
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        </div>
      )}
    </>
  )
}
