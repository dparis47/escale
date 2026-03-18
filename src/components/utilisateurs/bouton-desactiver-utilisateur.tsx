'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserX, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface Props {
  id: number
  nom: string
  estDesactive: boolean
  estSoiMeme: boolean
}

export function BoutonDesactiverUtilisateur({ id, nom, estDesactive, estSoiMeme }: Props) {
  const router = useRouter()
  const [enCours, setEnCours] = useState(false)

  async function basculer() {
    if (estSoiMeme) return

    const action = estDesactive ? 'réactiver' : 'désactiver'
    if (!confirm(`${estDesactive ? 'Réactiver' : 'Désactiver'} le compte de ${nom} ?`)) return

    setEnCours(true)
    try {
      const url = estDesactive
        ? `/api/utilisateurs/${id}/reactiver`
        : `/api/utilisateurs/${id}`
      const method = estDesactive ? 'PATCH' : 'DELETE'

      const res = await fetch(url, { method })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        alert(data?.erreur ?? `Erreur lors de la tentative de ${action}.`)
        return
      }
      router.refresh()
    } finally {
      setEnCours(false)
    }
  }

  if (estSoiMeme) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={basculer}
          disabled={enCours}
        >
          {estDesactive
            ? <UserCheck className="h-4 w-4" />
            : <UserX className="h-4 w-4" />
          }
        </Button>
      </TooltipTrigger>
      <TooltipContent>{estDesactive ? 'Réactiver' : 'Désactiver'}</TooltipContent>
    </Tooltip>
  )
}
