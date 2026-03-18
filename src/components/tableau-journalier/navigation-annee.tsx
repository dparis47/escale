'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  annee:      number
  basePath?:  string  // défaut '/partenaires'
}

export function NavigationAnnee({ annee, basePath = '/partenaires' }: Props) {
  const router        = useRouter()
  const anneeActuelle = new Date().getFullYear()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`${basePath}?annee=${annee - 1}`)}
      >
        ← Année précédente
      </Button>
      {annee !== anneeActuelle && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(basePath)}
        >
          Année actuelle
        </Button>
      )}
      {annee < anneeActuelle && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`${basePath}?annee=${annee + 1}`)}
        >
          Année suivante →
        </Button>
      )}
    </div>
  )
}
