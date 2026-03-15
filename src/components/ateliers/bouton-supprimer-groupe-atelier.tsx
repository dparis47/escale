'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

export function BoutonSupprimerGroupeAtelier({ ids }: { ids: number[] }) {
  const router = useRouter()
  const [enCours, setEnCours] = useState(false)

  async function supprimer() {
    const n = ids.length
    if (!confirm(`Supprimer cet atelier et ses ${n} séance${n > 1 ? 's' : ''} ?`)) return
    setEnCours(true)
    await Promise.all(ids.map((id) => fetch(`/api/ateliers/${id}`, { method: 'DELETE' })))
    router.refresh()
    setEnCours(false)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={supprimer}
          disabled={enCours}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Supprimer l&apos;atelier</TooltipContent>
    </Tooltip>
  )
}
