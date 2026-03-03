'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  id: number
  redirectApres?: string   // si fourni, on redirect après suppression (fiche détail)
}

export function BoutonSupprimerPersonne({ id, redirectApres }: Props) {
  const router = useRouter()
  const [enCours, setEnCours] = useState(false)

  async function supprimer() {
    if (!confirm('Supprimer cette fiche personne ?')) return
    setEnCours(true)
    await fetch(`/api/personnes/${id}`, { method: 'DELETE' })
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
