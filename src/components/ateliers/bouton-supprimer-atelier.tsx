'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function BoutonSupprimerAtelier({ id }: { id: number }) {
  const router = useRouter()
  const [enCours, setEnCours] = useState(false)

  async function supprimer() {
    if (!confirm('Supprimer cet atelier définitivement ?')) return
    setEnCours(true)
    await fetch(`/api/ateliers/${id}`, { method: 'DELETE' })
    router.refresh()
    setEnCours(false)
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
