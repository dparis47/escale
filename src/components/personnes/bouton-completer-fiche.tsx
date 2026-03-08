'use client'

import { Button } from '@/components/ui/button'
import { useSetModeEdition } from '@/contexts/sauvegarde-accompagnement'

export function BoutonCompleterFiche() {
  const setModeEdition = useSetModeEdition()

  return (
    <Button
      size="sm"
      variant="outline"
      className="ml-4 border-amber-400 text-amber-800 hover:bg-amber-100"
      onClick={() => setModeEdition(true)}
    >
      Compléter le dossier
    </Button>
  )
}
