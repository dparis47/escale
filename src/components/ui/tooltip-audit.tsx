'use client'

import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formaterDateCourte } from '@/lib/dates'

interface Props {
  saisiePar?: { prenom: string; nom: string } | null
  modifiePar?: { prenom: string; nom: string } | null
  createdAt?: string | Date
  updatedAt?: string | Date
}

export function TooltipAudit({ saisiePar, modifiePar, createdAt, updatedAt }: Props) {
  const auditInfo = [
    saisiePar && createdAt
      ? `Saisi par ${saisiePar.prenom} ${saisiePar.nom} le ${formaterDateCourte(new Date(createdAt))}`
      : null,
    modifiePar && updatedAt
      ? `Modifié par ${modifiePar.prenom} ${modifiePar.nom} le ${formaterDateCourte(new Date(updatedAt))}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  if (!auditInfo) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-8 w-8 cursor-default select-none items-center justify-center text-muted-foreground">
          <Info className="h-4 w-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {auditInfo}
      </TooltipContent>
    </Tooltip>
  )
}
