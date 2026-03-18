'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useModeEdition } from '@/contexts/sauvegarde-accompagnement'

interface Props {
  personId: number
  aFSEEnCours: boolean
  aASIDEnCours: boolean
}

export function BoutonsAccompagnement({ personId, aFSEEnCours, aASIDEnCours }: Props) {
  const modeEdition = useModeEdition()

  if (modeEdition) return null

  return (
    <div className="flex gap-2">
      {!aASIDEnCours && (
        <Link href={`/accompagnement/nouveau-asid?personId=${personId}`}>
          <Button variant="outline" size="sm" className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100">
            + Démarrer un acc. ASID
          </Button>
        </Link>
      )}
      {!aFSEEnCours && (
        <Link href={`/accompagnement/nouveau-fse?personId=${personId}`}>
          <Button variant="outline" size="sm" className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100">
            + Démarrer un acc. FSE+
          </Button>
        </Link>
      )}
    </div>
  )
}
