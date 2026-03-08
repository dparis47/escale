'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Info, Trash2 } from 'lucide-react'
import type { VisiteAvecRelations } from '@/types/visits'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FormulaireVisite } from './formulaire-visite'
import { formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { fromPrisma, themesAvecFeuilles } from '@/lib/demarches'

interface BadgesAccompagnement { fse: boolean; asid: boolean }

interface Props {
  visite:  VisiteAvecRelations
  dateISO: string
  badges?: BadgesAccompagnement
}

export function LigneVisite({ visite, dateISO, badges }: Props) {
  const router = useRouter()
  const [enSuppression, setEnSuppression] = useState(false)
  const [survol, setSurvol] = useState(false)

  async function supprimer() {
    if (!confirm('Supprimer cette visite ?')) return
    setEnSuppression(true)
    await fetch(`/api/visites/${visite.id}`, { method: 'DELETE' })
    router.refresh()
  }

  const nomPrenom = `${visite.person.nom.toUpperCase()} ${capitaliserPrenom(visite.person.prenom)}`

  const auditInfo = [
    visite.saisiePar
      ? `Saisi par ${visite.saisiePar.prenom} ${visite.saisiePar.nom} le ${formaterDateCourte(visite.createdAt)}`
      : null,
    visite.modifiePar
      ? `Modifié par ${visite.modifiePar.prenom} ${visite.modifiePar.nom} le ${formaterDateCourte(visite.updatedAt)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const cellBase = `border-b text-sm ${survol ? 'bg-muted/30' : ''}`

  const survolProps = {
    onMouseEnter: () => setSurvol(true),
    onMouseLeave: () => setSurvol(false),
  }

  return (
    <tr>
      {/* Dossier */}
      <td className={`${cellBase} px-2 py-3 text-center`} {...survolProps}>
        {!visite.person.estInscrit && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-200 whitespace-nowrap">
            À faire
          </span>
        )}
      </td>

      {/* Type accompagnement */}
      <td className={`${cellBase} px-2 py-3`} {...survolProps}>
        <div className="flex flex-wrap gap-1">
          {badges?.fse && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">FSE+</span>
          )}
          {badges?.asid && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">ASID</span>
          )}
        </div>
      </td>

      {/* Nom / Prénom */}
      <td className={`${cellBase} px-3 py-3 font-medium`} {...survolProps}>
        <span className="whitespace-nowrap text-blue-700">{nomPrenom}</span>
      </td>

      {/* Démarches */}
      <td className={`${cellBase} px-3 py-3`} {...survolProps}>
        <div className="flex flex-col gap-1.5">
          {visite.orienteParFT && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 border border-gray-200 self-start">
              Orienté(e) par France Travail
            </span>
          )}
          {visite.demarches && (() => {
            const themes = themesAvecFeuilles(fromPrisma(visite.demarches as unknown as Record<string, unknown>))
            return themes.map(({ id, label, feuilles }) => (
              <div key={id}>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                  {label}
                </span>
                <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 pl-1">
                  {feuilles.map((f) => (
                    <span key={f} className="text-xs text-muted-foreground">· {f}</span>
                  ))}
                </div>
              </div>
            ))
          })()}
          {visite.demarches?.autresInput && (
            <p className="text-xs text-muted-foreground">Autres : {visite.demarches.autresInput}</p>
          )}
        </div>
      </td>

      {/* Commentaire */}
      <td className={`${cellBase} px-3 py-3 text-muted-foreground`} {...survolProps}>
        {visite.commentaire ? (
          <span className="whitespace-pre-wrap text-sm">{visite.commentaire}</span>
        ) : '—'}
      </td>

      {/* Actions */}
      <td className={`${cellBase} px-3 py-3`} {...survolProps}>
        <div className="flex items-center gap-1">
          {auditInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default select-none text-muted-foreground">
                  <Info className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {auditInfo}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/personnes/${visite.personId}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-600">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Voir le dossier</TooltipContent>
          </Tooltip>
          <FormulaireVisite dateISO={dateISO} mode="edition" visite={visite} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={supprimer}
                disabled={enSuppression}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Supprimer</TooltipContent>
          </Tooltip>
        </div>
      </td>

    </tr>
  )
}
