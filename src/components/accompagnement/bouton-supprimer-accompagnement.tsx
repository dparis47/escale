'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface Props {
  id:            number
  redirectApres?: string
}

export function BoutonSupprimerAccompagnement({ id, redirectApres }: Props) {
  const router   = useRouter()
  const [enCours, setEnCours] = useState(false)

  async function supprimer() {
    if (!confirm('Supprimer cet accompagnement ?')) return
    setEnCours(true)
    await fetch(`/api/accompagnement/${id}`, { method: 'DELETE' })
    if (redirectApres) {
      router.push(redirectApres)
    } else {
      router.refresh()
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={supprimer}
          disabled={enCours}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Supprimer</TooltipContent>
    </Tooltip>
  )
}
