'use client'

import { useRef, useState } from 'react'
import { FileText, Upload, Download, Trash2, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MOIS_NOMS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export interface PlanningData {
  id:        number
  mois:      number
  annee:     number
  nom:       string
  createdAt: string
}

interface Props {
  planningsInitiaux: PlanningData[]
  peutGerer:         boolean
  moisCourant:       number
  anneeCourante:     number
}

export function SectionPlanningMensuel({
  planningsInitiaux,
  peutGerer,
  moisCourant,
  anneeCourante,
}: Props) {
  const [plannings,       setPlannings]       = useState<PlanningData[]>(planningsInitiaux)
  const [enCours,         setEnCours]         = useState(false)
  const [ajoutOuvert,     setAjoutOuvert]     = useState(false)
  const [moisSelectionne, setMoisSelectionne] = useState<number>(moisCourant)
  const [anneeSelectionnee, setAnneeSelectionnee] = useState<number>(anneeCourante)

  // Un ref par mois (courant + ajout passé)
  const inputCourantRef = useRef<HTMLInputElement | null>(null)
  const inputPasseRef   = useRef<HTMLInputElement | null>(null)

  // Cible pour l'upload en cours (courant ou mois sélectionné)
  const cibleMois  = useRef(moisCourant)
  const cibleAnnee = useRef(anneeCourante)

  const planningCourant = plannings.find(
    (p) => p.mois === moisCourant && p.annee === anneeCourante
  )
  const planningsPrecedents = plannings
    .filter((p) => !(p.mois === moisCourant && p.annee === anneeCourante))
    .slice(0, 11)

  async function telecharger(planning: PlanningData) {
    setEnCours(true)
    try {
      const res = await fetch(`/api/plannings/${planning.id}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = planning.nom
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setEnCours(false)
    }
  }

  async function deposer(mois: number, annee: number, e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setEnCours(true)
    try {
      const form = new FormData()
      form.append('fichier', fichier)
      form.append('mois',    String(mois))
      form.append('annee',   String(annee))
      const res = await fetch('/api/plannings', { method: 'POST', body: form })
      if (res.ok) {
        const nouveau: PlanningData = await res.json()
        setPlannings((prev) => {
          const sans = prev.filter((p) => !(p.mois === mois && p.annee === annee))
          return [nouveau, ...sans].sort((a, b) =>
            b.annee !== a.annee ? b.annee - a.annee : b.mois - a.mois
          )
        })
        setAjoutOuvert(false)
      }
    } finally {
      setEnCours(false)
      if (inputCourantRef.current) inputCourantRef.current.value = ''
      if (inputPasseRef.current)   inputPasseRef.current.value   = ''
    }
  }

  async function supprimer(planning: PlanningData) {
    if (!confirm(`Supprimer le planning de ${MOIS_NOMS[planning.mois]} ${planning.annee} ?`)) return
    setEnCours(true)
    try {
      const res = await fetch(`/api/plannings/${planning.id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlannings((prev) => prev.filter((p) => p.id !== planning.id))
      }
    } finally {
      setEnCours(false)
    }
  }

  // Années disponibles pour la sélection (année courante et les 2 précédentes)
  const anneesDispo = [anneeCourante, anneeCourante - 1, anneeCourante - 2]

  return (
    <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Planning mensuel des activités</h2>
      </div>

      {/* Mois courant */}
      <div className="mb-3 rounded-md bg-muted/40 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {MOIS_NOMS[moisCourant]} {anneeCourante} — mois en cours
        </p>

        {planningCourant ? (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="flex-1 truncate text-sm text-foreground" title={planningCourant.nom}>
              {planningCourant.nom}
            </span>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"
              onClick={() => telecharger(planningCourant)} disabled={enCours}>
              <Download className="h-3 w-3" /> Télécharger
            </Button>
            {peutGerer && (
              <>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                  onClick={() => inputCourantRef.current?.click()} disabled={enCours}>
                  <Upload className="h-3 w-3" /> Remplacer
                </Button>
                <Button variant="ghost" size="sm"
                  className="h-7 text-muted-foreground hover:text-destructive"
                  onClick={() => supprimer(planningCourant)} disabled={enCours}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-muted-foreground italic">
              Aucun planning déposé pour ce mois
            </span>
            {peutGerer && (
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
                onClick={() => inputCourantRef.current?.click()} disabled={enCours}>
                <Upload className="h-3 w-3" /> Déposer le planning
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Mois précédents */}
      {planningsPrecedents.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Mois précédents
          </p>
          <div className="space-y-1">
            {planningsPrecedents.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/30">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="w-28 shrink-0 text-xs font-medium text-foreground">
                  {MOIS_NOMS[p.mois]} {p.annee}
                </span>
                <span className="flex-1 truncate text-xs text-muted-foreground" title={p.nom}>
                  {p.nom}
                </span>
                <button type="button" disabled={enCours}
                  className="shrink-0 text-xs text-blue-600 hover:underline disabled:opacity-50"
                  onClick={() => telecharger(p)}>
                  Télécharger
                </button>
                {peutGerer && (
                  <button type="button" disabled={enCours} title="Supprimer"
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                    onClick={() => supprimer(p)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ajouter un planning pour un mois passé */}
      {peutGerer && (
        <div>
          {!ajoutOuvert ? (
            <button type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setAjoutOuvert(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              Ajouter un planning pour un autre mois
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-md border p-2">
              <select
                value={moisSelectionne}
                onChange={(e) => setMoisSelectionne(Number(e.target.value))}
                className="h-7 rounded border border-input bg-transparent px-2 text-xs"
              >
                {MOIS_NOMS.slice(1).map((nom, i) => (
                  <option key={i + 1} value={i + 1}>{nom}</option>
                ))}
              </select>
              <select
                value={anneeSelectionnee}
                onChange={(e) => setAnneeSelectionnee(Number(e.target.value))}
                className="h-7 rounded border border-input bg-transparent px-2 text-xs"
              >
                {anneesDispo.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
                onClick={() => inputPasseRef.current?.click()} disabled={enCours}>
                <Upload className="h-3 w-3" /> Choisir un PDF
              </Button>
              <button type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setAjoutOuvert(false)}>
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inputs fichier cachés */}
      <input ref={inputCourantRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => deposer(moisCourant, anneeCourante, e)} />
      <input ref={inputPasseRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => deposer(moisSelectionne, anneeSelectionnee, e)} />
    </div>
  )
}
