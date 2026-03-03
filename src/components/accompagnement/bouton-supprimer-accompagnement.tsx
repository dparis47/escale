'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={supprimer}
      disabled={enCours}
    >
      Supprimer
    </Button>
  )
}
