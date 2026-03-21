'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Eye, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { BoutonSupprimerGroupeAtelier } from '@/components/ateliers/bouton-supprimer-groupe-atelier'
import { BoutonEmargementAtelier } from '@/components/ateliers/bouton-emargement-atelier'
import { COULEURS_CATEGORIE } from '@/schemas/atelier'
import type { CategorieAtelierData, GroupeAtelierData, SessionAtelierData } from '@/schemas/atelier'

interface Props {
  categories:        CategorieAtelierData[]
  estTS:             boolean
  peutGerer:         boolean
  participantFilter?: string
}

interface ParticipantInfo {
  personId: number
  nom:      string
  prenom:   string
  enASID:   boolean
  enFSE:    boolean
}

export function TableauAteliers({ categories, estTS, peutGerer, participantFilter }: Props) {
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set())
  const [cache,   setCache]   = useState<Map<number, ParticipantInfo[]>>(new Map())
  const [loading, setLoading] = useState<Set<number>>(new Set())

  // Auto-expand toutes les séances quand un filtre participant est actif
  useEffect(() => {
    if (!participantFilter) return
    const allIds = categories.flatMap((c) => c.groupes.flatMap((g) => g.sessions.map((s) => s.id)))
    setExpandedSessions(new Set(allIds))
    for (const id of allIds) {
      fetchParticipants(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantFilter, categories])

  const fetchParticipants = useCallback(async (id: number) => {
    if (cache.has(id)) return
    setLoading((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/ateliers/${id}`)
      if (res.ok) {
        const data = await res.json() as {
          participants: Array<{
            person: {
              id: number
              nom: string
              prenom: string
              accompagnements: Array<{ id: number; suiviASID: { id: number } | null }>
            }
          }>
        }
        const participants: ParticipantInfo[] = data.participants.map((p) => {
          const accos   = p.person.accompagnements
          const hasASID = accos.some((a) => a.suiviASID !== null)
          const hasFSE  = accos.some((a) => a.suiviASID === null)
          return {
            personId: p.person.id,
            nom:      p.person.nom,
            prenom:   p.person.prenom,
            enASID:   hasASID,
            enFSE:    hasFSE,
          }
        })
        setCache((prev) => new Map(prev).set(id, participants))
      }
    } finally {
      setLoading((prev) => {
        const s = new Set(prev)
        s.delete(id)
        return s
      })
    }
  }, [cache])

  function toggleSession(id: number) {
    setExpandedSessions((prev) => {
      const s = new Set(prev)
      if (s.has(id)) {
        s.delete(id)
      } else {
        s.add(id)
        fetchParticipants(id)
      }
      return s
    })
  }

  function toggleGroup(sessions: SessionAtelierData[]) {
    const ids        = sessions.map((s) => s.id)
    const allExpanded = ids.every((id) => expandedSessions.has(id))
    setExpandedSessions((prev) => {
      const s = new Set(prev)
      if (allExpanded) {
        for (const id of ids) s.delete(id)
      } else {
        for (const id of ids) {
          s.add(id)
          fetchParticipants(id)
        }
      }
      return s
    })
  }

  function renderParticipantsRow(id: number) {
    const isLoading   = loading.has(id)
    const participants = cache.get(id)

    if (isLoading && !participants) {
      return (
        <tr>
          <td colSpan={3} className="border-t bg-muted/20 px-8 py-2 text-sm text-muted-foreground">
            Chargement…
          </td>
        </tr>
      )
    }

    if (!participants) {
      return (
        <tr>
          <td colSpan={3} className="border-t bg-muted/20 px-8 py-2 text-sm text-muted-foreground">
            Aucun participant
          </td>
        </tr>
      )
    }

    const filtered = participantFilter
      ? participants.filter((p) => {
          const search = participantFilter.toLowerCase()
          return p.nom.toLowerCase().includes(search) || p.prenom.toLowerCase().includes(search)
        })
      : participants

    if (filtered.length === 0) {
      return (
        <tr>
          <td colSpan={3} className="border-t bg-muted/20 px-8 py-2 text-sm text-muted-foreground">
            Aucun participant
          </td>
        </tr>
      )
    }

    return filtered.map((p) => (
      <tr key={`p-${id}-${p.personId}`} className="bg-muted/20">
        <td colSpan={3} className="border-t border-muted/40 py-1 pl-12 text-sm">
          <Link href={`/personnes/${p.personId}`} className="hover:underline">
            {p.nom.toUpperCase()} {p.prenom}
          </Link>
          {p.enASID && (
            <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              ASID
            </span>
          )}
          {p.enFSE && (
            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              FSE+
            </span>
          )}
        </td>
      </tr>
    ))
  }

  return (
    <tbody>
      {categories.map((cat) => {
        const couleur = COULEURS_CATEGORIE[cat.couleur] ?? COULEURS_CATEGORIE.gray
        return (
          <CategorieRows
            key={cat.id}
            cat={cat}
            couleur={couleur}
            estTS={estTS}
            peutGerer={peutGerer}
            expandedSessions={expandedSessions}
            toggleGroup={toggleGroup}
            toggleSession={toggleSession}
            renderParticipantsRow={renderParticipantsRow}
          />
        )
      })}
    </tbody>
  )
}

// ── Sous-composant catégorie ─────────────────────────────────────────────

interface CategorieRowsProps {
  cat:               CategorieAtelierData
  couleur:           { bg: string; text: string; sub: string }
  estTS:             boolean
  peutGerer:         boolean
  expandedSessions:  Set<number>
  toggleGroup:       (sessions: SessionAtelierData[]) => void
  toggleSession:     (id: number) => void
  renderParticipantsRow: (id: number) => React.ReactNode
}

function CategorieRows({
  cat,
  couleur,
  estTS,
  peutGerer,
  expandedSessions,
  toggleGroup,
  toggleSession,
  renderParticipantsRow,
}: CategorieRowsProps) {
  return (
    <>
      {/* En-tête catégorie — lecture seule */}
      <tr>
        <td colSpan={3} className="border-t-2 border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold uppercase tracking-wide text-slate-700">
          {cat.nom}
        </td>
      </tr>
      {/* Groupes */}
      {cat.groupes.map((groupe, gi) => (
        <GroupeRows
          key={`cat-${cat.id}-g-${gi}`}
          groupe={groupe}
          couleur={couleur}
          estTS={estTS}
          peutGerer={peutGerer}
          expandedSessions={expandedSessions}
          toggleGroup={toggleGroup}
          toggleSession={toggleSession}
          renderParticipantsRow={renderParticipantsRow}
        />
      ))}
    </>
  )
}

// ── Sous-composant groupe ────────────────────────────────────────────────

interface GroupeRowsProps {
  groupe:            GroupeAtelierData
  couleur:           { bg: string; text: string; sub: string }
  estTS:             boolean
  peutGerer:         boolean
  expandedSessions:  Set<number>
  toggleGroup:       (sessions: SessionAtelierData[]) => void
  toggleSession:     (id: number) => void
  renderParticipantsRow: (id: number) => React.ReactNode
}

function GroupeRows({
  groupe,
  couleur,
  estTS,
  peutGerer,
  expandedSessions,
  toggleGroup,
  toggleSession,
  renderParticipantsRow,
}: GroupeRowsProps) {
  const allExpanded    = groupe.sessions.every((s) => expandedSessions.has(s.id))
  const ChevronGroupe  = allExpanded ? ChevronDown : ChevronRight

  return (
    <>
      {/* Ligne de groupe (atelier) */}
      <tr className={couleur.bg}>
        <td
          className={`cursor-pointer px-3 py-1.5 pl-4 text-xs font-semibold tracking-wide ${couleur.text}`}
          onClick={() => toggleGroup(groupe.sessions)}
        >
          <span className="flex items-center gap-1">
            <ChevronGroupe className="h-4 w-4 shrink-0" />
            <span className="uppercase">{groupe.themeNom}</span>
            {groupe.prestataireNom && (
              <span className="ml-1 normal-case">{groupe.prestataireNom}</span>
            )}
            {groupe.lieu && (
              <span className={`ml-1 font-normal normal-case ${couleur.sub}`}>— {groupe.lieu}</span>
            )}
            <span className={`ml-1 font-normal normal-case ${couleur.sub}`}>
              · {groupe.sessions.length} séance{groupe.sessions.length > 1 ? 's' : ''}
            </span>
          </span>
        </td>
        <td className={`px-3 py-1.5 text-center text-xs font-semibold ${couleur.text}`}>
          {groupe.sessions.reduce((sum, s) => sum + s.nbParticipants, 0)}
        </td>
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/ateliers/groupe/${groupe.sessions[0].id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Voir l&apos;atelier</TooltipContent>
            </Tooltip>
            {estTS && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/ateliers/groupe/${groupe.sessions[0].id}/modifier`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Modifier l&apos;atelier</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/ateliers/groupe/${groupe.sessions[0].id}/ajouter-seance`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Ajouter une séance</TooltipContent>
                </Tooltip>
                <BoutonSupprimerGroupeAtelier ids={groupe.sessions.map((s) => s.id)} />
              </>
            )}
            <BoutonEmargementAtelier sessions={groupe.sessions} peutGerer={peutGerer} />
          </div>
        </td>
      </tr>
      {/* Lignes séances — dates simples, sans boutons d'action */}
      {groupe.sessions.map((a) => (
        <SeanceRows
          key={a.id}
          a={a}
          sessionExpanded={expandedSessions.has(a.id)}
          toggleSession={toggleSession}
          renderParticipantsRow={renderParticipantsRow}
        />
      ))}
    </>
  )
}

// ── Sous-composant séance ────────────────────────────────────────────────

interface SeanceRowsProps {
  a:                    SessionAtelierData
  sessionExpanded:      boolean
  toggleSession:        (id: number) => void
  renderParticipantsRow: (id: number) => React.ReactNode
}

function SeanceRows({ a, sessionExpanded, toggleSession, renderParticipantsRow }: SeanceRowsProps) {
  const Chevron = sessionExpanded ? ChevronDown : ChevronRight

  return (
    <>
      <tr className="border-t hover:bg-muted/30">
        <td
          className="cursor-pointer px-3 py-2 pl-6 text-muted-foreground"
          onClick={() => toggleSession(a.id)}
        >
          <span className="flex items-center gap-1">
            <Chevron className="h-3.5 w-3.5 shrink-0" />
            <span>{a.date}</span>
            {a.themeAutre && (
              <span className="ml-1 font-medium text-foreground">{a.themeAutre}</span>
            )}
          </span>
        </td>
        <td className="px-3 py-2 text-center text-sm text-muted-foreground">
          {a.nbParticipants > 0 ? a.nbParticipants : '—'}
        </td>
        <td />
      </tr>
      {sessionExpanded && renderParticipantsRow(a.id)}
    </>
  )
}
