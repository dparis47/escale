'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { formaterDateCourte } from '@/lib/dates'
import { useRegistrerSauvegarde, useModeEdition } from '@/contexts/sauvegarde-accompagnement'
import type { SuiviASID } from '@prisma/client'

interface PrescriptionSimple { id: number; nom: string; periode: string | null }

interface Props {
  accompagnementId: number
  suiviASID:        SuiviASID & { prescriptions: PrescriptionSimple[] }
  prescripteurs:    string[]
  referentsASID:    string[]
}

type PeriodeKey = 'ENTREE' | 'RENOUVELLEMENT_1' | 'RENOUVELLEMENT_2'

function toDateStr(d: Date | null | undefined): string {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

export function SectionAccompagnementASID({
  accompagnementId,
  suiviASID,
  prescripteurs,
  referentsASID,
}: Props) {
  const router      = useRouter()
  const modeEdition = useModeEdition()
  const [ouvert, setOuvert] = useState(true)

  // Combiner nom+prénom en une seule chaîne pour les comboboxes
  const initPrescripteur = [suiviASID.prescripteurNom, suiviASID.prescripteurPrenom].filter(Boolean).join(' ')
  const initReferentASID = [suiviASID.referentNom,     suiviASID.referentPrenom    ].filter(Boolean).join(' ')

  const [prescripteur, setPrescripteur] = useState(initPrescripteur)
  const [referentASID, setReferentASID] = useState(initReferentASID)

  const [vals, setVals] = useState({
    dateEntree:               toDateStr(suiviASID.dateEntree),
    dateRenouvellement:       toDateStr(suiviASID.dateRenouvellement),
    dateRenouvellement2:      toDateStr(suiviASID.dateRenouvellement2),
    dateSortie:               toDateStr(suiviASID.dateSortie),
    observation:              suiviASID.observation              ?? '',
    suiviNonRealiseRaison:    suiviASID.suiviNonRealiseRaison    ?? '',
    reorientationDescription: suiviASID.reorientationDescription ?? '',
  })

  const [orientationNMoins2, setOrientNm2] = useState(suiviASID.suiviNMoins2EnCours)
  const [orientationNMoins1, setOrientNm1] = useState(suiviASID.orientationNMoins1)
  const [orientationN,       setOrientN]   = useState(suiviASID.orientationN)
  const [suiviRealise,       setSuiviReal] = useState(suiviASID.suiviRealise)
  const [reorientation,      setReorient]  = useState(suiviASID.reorientation)
  const [erreur, setErreur] = useState('')

  // ── Prescriptions inline ──────────────────────────────────────────
  const inputRefEntree  = useRef<HTMLInputElement>(null)
  const inputRefRenouv1 = useRef<HTMLInputElement>(null)
  const inputRefRenouv2 = useRef<HTMLInputElement>(null)

  const inputRefs: Record<PeriodeKey, React.RefObject<HTMLInputElement | null>> = {
    ENTREE:           inputRefEntree,
    RENOUVELLEMENT_1: inputRefRenouv1,
    RENOUVELLEMENT_2: inputRefRenouv2,
  }

  const [enCoursPrescription, setEnCoursPrescription] = useState(false)
  const [erreurPrescription,  setErreurPrescription]  = useState<string | null>(null)

  async function telecharger(pid: number, nom: string) {
    const res = await fetch(`/api/accompagnement/${accompagnementId}/prescriptions/${pid}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = nom
    a.click()
    URL.revokeObjectURL(url)
  }

  async function uploader(e: React.ChangeEvent<HTMLInputElement>, periode: PeriodeKey) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setErreurPrescription(null)
    setEnCoursPrescription(true)
    const form = new FormData()
    form.append('fichier', fichier)
    form.append('periode', periode)
    const res = await fetch(`/api/accompagnement/${accompagnementId}/prescriptions`, {
      method: 'POST',
      body:   form,
    })
    setEnCoursPrescription(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErreurPrescription((data as { erreur?: string }).erreur ?? "Erreur lors de l'envoi")
    } else {
      router.refresh()
    }
    const ref = inputRefs[periode]
    if (ref.current) ref.current.value = ''
  }

  async function supprimer(pid: number, nom: string) {
    if (!confirm(`Supprimer la fiche "${nom}" ?`)) return
    setEnCoursPrescription(true)
    await fetch(`/api/accompagnement/${accompagnementId}/prescriptions/${pid}`, { method: 'DELETE' })
    setEnCoursPrescription(false)
    router.refresh()
  }

  // Rendu inline des fiches de prescription pour une période donnée
  function fichesPrescription(periode: PeriodeKey) {
    const fiches = suiviASID.prescriptions.filter((p) => (p.periode ?? 'ENTREE') === periode)
    return (
      <>
        {fiches.map((p) => (
          <span key={p.id} className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              onClick={() => telecharger(p.id, p.nom)}
              disabled={enCoursPrescription}
              className="h-7 text-xs"
            >
              ↓ {p.nom}
            </Button>
            {modeEdition && (
              <Button
                variant="ghost" size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => supprimer(p.id, p.nom)}
                disabled={enCoursPrescription}
              >
                ×
              </Button>
            )}
          </span>
        ))}
        {modeEdition && fiches.length === 0 && (
          <Button
            variant="outline" size="sm"
            className="h-7 text-xs"
            onClick={() => inputRefs[periode].current?.click()}
            disabled={enCoursPrescription}
          >
            + Ajouter une fiche de prescription
          </Button>
        )}
      </>
    )
  }

  const set = (key: keyof typeof vals) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setVals((prev) => ({ ...prev, [key]: e.target.value }))


  async function sauvegarder() {
    setErreur('')
    try {
      const res = await fetch(`/api/accompagnement/${accompagnementId}/suivi-asid`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          prescripteurNom:    prescripteur || null,
          prescripteurPrenom: null,
          referentNom:        referentASID || null,
          referentPrenom:     null,
          dateEntree:               vals.dateEntree          || undefined,
          dateRenouvellement:       vals.dateRenouvellement  || null,
          dateRenouvellement2:      vals.dateRenouvellement2 || null,
          dateSortie:               vals.dateSortie          || null,
          observation:              vals.observation         || null,
          orientationNMoins1,
          orientationN,
          suiviNMoins2EnCours: orientationNMoins2,
          suiviRealise,
          suiviNonRealiseRaison:    !suiviRealise ? (vals.suiviNonRealiseRaison || null) : null,
          reorientation,
          reorientationDescription: reorientation ? (vals.reorientationDescription || null) : null,
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

  useRegistrerSauvegarde('accompagnement-asid', sauvegarder)

  const sectionTitre = (
    <h2
      onClick={() => setOuvert((o) => !o)}
      className="mb-3 mt-6 flex cursor-pointer select-none items-center gap-2 border-b pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${ouvert ? 'rotate-90' : ''}`} />
      Accompagnement ASID
    </h2>
  )

  if (!modeEdition) {
    return (
      <>
        {sectionTitre}
        {ouvert && (
          <div className="space-y-1 text-sm">
            {prescripteur && (
              <div className="flex gap-2 py-0.5">
                <span className="w-52 shrink-0 text-muted-foreground">Prescripteur</span>
                <span>{prescripteur}</span>
              </div>
            )}
            <div className="flex gap-2 py-0.5">
              <span className="w-52 shrink-0 text-muted-foreground">Référent RSA</span>
              <span>{referentASID || '—'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 py-0.5">
              <span className="w-52 shrink-0 text-muted-foreground">{"Date d'entrée ASID"}</span>
              <span>{vals.dateEntree ? formaterDateCourte(new Date(vals.dateEntree)) : '—'}</span>
              {fichesPrescription('ENTREE')}
            </div>
            <div className="flex flex-wrap items-center gap-2 py-0.5">
              <span className="w-52 shrink-0 text-muted-foreground">1er renouvellement</span>
              <span>{vals.dateRenouvellement ? formaterDateCourte(new Date(vals.dateRenouvellement)) : '—'}</span>
              {fichesPrescription('RENOUVELLEMENT_1')}
            </div>
            <div className="flex flex-wrap items-center gap-2 py-0.5">
              <span className="w-52 shrink-0 text-muted-foreground">2ème renouvellement</span>
              <span>{vals.dateRenouvellement2 ? formaterDateCourte(new Date(vals.dateRenouvellement2)) : '—'}</span>
              {fichesPrescription('RENOUVELLEMENT_2')}
            </div>
            <div className="flex gap-2 py-0.5">
              <span className="w-52 shrink-0 text-muted-foreground">Date de sortie ASID</span>
              <span>{vals.dateSortie ? formaterDateCourte(new Date(vals.dateSortie)) : '—'}</span>
            </div>
            <div className="flex gap-2 py-0.5">
              <span className="w-52 shrink-0 text-muted-foreground">Orientations</span>
              <span>
                {[orientationNMoins2 && 'N-2', orientationNMoins1 && 'N-1', orientationN && 'N']
                  .filter(Boolean).join(', ') || '—'}
              </span>
            </div>
            <div className="flex gap-2 py-0.5">
              <span className="w-52 shrink-0 text-muted-foreground">Suivi réalisé</span>
              <span>{suiviRealise ? 'Oui' : 'Non'}</span>
            </div>
            {!suiviRealise && vals.suiviNonRealiseRaison && (
              <div className="flex gap-2 py-0.5">
                <span className="w-52 shrink-0 text-muted-foreground">Raison</span>
                <span>{vals.suiviNonRealiseRaison}</span>
              </div>
            )}
            <div className="flex gap-2 py-0.5">
              <span className="w-52 shrink-0 text-muted-foreground">Réorientation</span>
              <span>{reorientation ? 'Oui' : 'Non'}</span>
            </div>
            {reorientation && vals.reorientationDescription && (
              <div className="flex gap-2 py-0.5">
                <span className="w-52 shrink-0 text-muted-foreground">Précision</span>
                <span>{vals.reorientationDescription}</span>
              </div>
            )}
            {vals.observation && (
              <div className="flex gap-2 py-0.5 mt-2">
                <span className="w-52 shrink-0 text-muted-foreground">Observation</span>
                <span className="whitespace-pre-wrap">{vals.observation}</span>
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {sectionTitre}
      {ouvert && (
        <div className="space-y-1.5">
          {/* Inputs fichiers cachés pour l'upload */}
          <input ref={inputRefEntree}  type="file" accept="application/pdf" className="hidden" onChange={(e) => uploader(e, 'ENTREE')} />
          <input ref={inputRefRenouv1} type="file" accept="application/pdf" className="hidden" onChange={(e) => uploader(e, 'RENOUVELLEMENT_1')} />
          <input ref={inputRefRenouv2} type="file" accept="application/pdf" className="hidden" onChange={(e) => uploader(e, 'RENOUVELLEMENT_2')} />

          {/* Prescripteur (combobox via datalist) */}
          <div className="flex items-center gap-2 py-0.5 text-sm">
            <span className="w-52 shrink-0 text-muted-foreground">Prescripteur</span>
            <input
              list="prescripteurs-list"
              className="h-7 rounded border border-input bg-background px-2 text-sm flex-1 max-w-xs"
              value={prescripteur}
              onChange={(e) => setPrescripteur(e.target.value)}
              placeholder="Nom du prescripteur…"
            />
            <datalist id="prescripteurs-list">
              {prescripteurs.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>

          {/* Référent RSA (combobox via datalist) */}
          <div className="flex items-center gap-2 py-0.5 text-sm">
            <span className="w-52 shrink-0 text-muted-foreground">Référent RSA</span>
            <input
              list="referentsasid-list"
              className="h-7 rounded border border-input bg-background px-2 text-sm flex-1 max-w-xs"
              value={referentASID}
              onChange={(e) => setReferentASID(e.target.value)}
              placeholder="Nom du référent RSA…"
            />
            <datalist id="referentsasid-list">
              {referentsASID.map((r) => <option key={r} value={r} />)}
            </datalist>
          </div>

          {/* Dates avec prescriptions inline */}
          <div className="flex flex-wrap items-center gap-2 py-0.5 text-sm">
            <span className="w-52 shrink-0 text-muted-foreground">{"Date d'entrée ASID"}</span>
            <input
              type="date"
              className="h-7 rounded border border-input bg-background px-2 text-sm"
              value={vals.dateEntree}
              onChange={set('dateEntree')}
            />
            {fichesPrescription('ENTREE')}
          </div>
          <div className="flex flex-wrap items-center gap-2 py-0.5 text-sm">
            <span className="w-52 shrink-0 text-muted-foreground">1er renouvellement</span>
            <input
              type="date"
              className="h-7 rounded border border-input bg-background px-2 text-sm"
              value={vals.dateRenouvellement}
              onChange={set('dateRenouvellement')}
            />
            {fichesPrescription('RENOUVELLEMENT_1')}
          </div>
          <div className="flex flex-wrap items-center gap-2 py-0.5 text-sm">
            <span className="w-52 shrink-0 text-muted-foreground">2ème renouvellement</span>
            <input
              type="date"
              className="h-7 rounded border border-input bg-background px-2 text-sm"
              value={vals.dateRenouvellement2}
              onChange={set('dateRenouvellement2')}
            />
            {fichesPrescription('RENOUVELLEMENT_2')}
          </div>
          <div className="flex items-center gap-2 py-0.5 text-sm">
            <span className="w-52 shrink-0 text-muted-foreground">Date de sortie ASID</span>
            <input
              type="date"
              className="h-7 rounded border border-input bg-background px-2 text-sm"
              value={vals.dateSortie}
              onChange={set('dateSortie')}
            />
          </div>

          {/* Orientations */}
          <div className="flex items-center gap-4 py-0.5 text-sm">
            <span className="w-52 shrink-0 text-muted-foreground">Orientations</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Checkbox id="orientNm2" checked={orientationNMoins2} onCheckedChange={(v) => setOrientNm2(!!v)} />
                <Label htmlFor="orientNm2" className="cursor-pointer font-normal text-sm">N-2</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox id="orientNm1" checked={orientationNMoins1} onCheckedChange={(v) => setOrientNm1(!!v)} />
                <Label htmlFor="orientNm1" className="cursor-pointer font-normal text-sm">N-1</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox id="orientN" checked={orientationN} onCheckedChange={(v) => setOrientN(!!v)} />
                <Label htmlFor="orientN" className="cursor-pointer font-normal text-sm">N</Label>
              </div>
            </div>
          </div>

          {/* Suivi réalisé */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-6 py-0.5 text-sm">
              <span className="w-52 shrink-0 text-muted-foreground">Suivi réalisé</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Checkbox id="suiviOui" checked={suiviRealise}  onCheckedChange={(v) => setSuiviReal(!!v)} />
                  <Label htmlFor="suiviOui" className="cursor-pointer font-normal text-sm">Oui</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox id="suiviNon" checked={!suiviRealise} onCheckedChange={(v) => setSuiviReal(!v)} />
                  <Label htmlFor="suiviNon" className="cursor-pointer font-normal text-sm">Non</Label>
                </div>
              </div>
            </div>
            {!suiviRealise && (
              <div className="ml-52 pl-2">
                <Input
                  placeholder="Raison du suivi non réalisé…"
                  value={vals.suiviNonRealiseRaison}
                  onChange={set('suiviNonRealiseRaison')}
                  className="max-w-sm text-sm"
                />
              </div>
            )}
          </div>

          {/* Réorientation */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-6 py-0.5 text-sm">
              <span className="w-52 shrink-0 text-muted-foreground">Réorientation</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Checkbox id="reorOui" checked={reorientation}  onCheckedChange={(v) => setReorient(!!v)} />
                  <Label htmlFor="reorOui" className="cursor-pointer font-normal text-sm">Oui</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox id="reorNon" checked={!reorientation} onCheckedChange={(v) => setReorient(!v)} />
                  <Label htmlFor="reorNon" className="cursor-pointer font-normal text-sm">Non</Label>
                </div>
              </div>
            </div>
            {reorientation && (
              <div className="ml-52 pl-2">
                <Input
                  placeholder="Réorientation définie…"
                  value={vals.reorientationDescription}
                  onChange={set('reorientationDescription')}
                  className="max-w-sm text-sm"
                />
              </div>
            )}
          </div>

          {/* Observation */}
          <div className="pt-1">
            <p className="mb-1 text-sm text-muted-foreground">Observation</p>
            <Textarea className="text-sm" rows={3} value={vals.observation} onChange={set('observation')} />
          </div>

          {erreurPrescription && <p className="text-xs text-destructive">{erreurPrescription}</p>}
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        </div>
      )}
    </>
  )
}
