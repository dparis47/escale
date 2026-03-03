'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  annee: number
}

export function NavigationAnnee({ annee }: Props) {
  const router      = useRouter()
  const anneeActuelle = new Date().getFullYear()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/partenaires?annee=${annee - 1}`)}
      >
        ← Année précédente
      </Button>
      {annee !== anneeActuelle && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/partenaires')}
        >
          Année actuelle
        </Button>
      )}
      {annee < anneeActuelle && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/partenaires?annee=${annee + 1}`)}
        >
          Année suivante →
        </Button>
      )}
    </div>
  )
}
