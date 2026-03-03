'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { estAujourdhui, jourPrecedent, jourSuivant, estFutur } from '@/lib/dates'

interface Props {
  dateISO:   string
  basePath?: string  // défaut "/"
}

export function NavigationDate({ dateISO, basePath = '/' }: Props) {
  const router   = useRouter()
  const base     = basePath.endsWith('?') ? basePath : basePath + (basePath.includes('?') ? '&' : '?')
  const rootHref = basePath

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`${base}date=${jourPrecedent(dateISO)}`)}
      >
        ← Jour précédent
      </Button>

      {!estAujourdhui(dateISO) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(rootHref)}
        >
          Aujourd'hui
        </Button>
      )}

      {!estAujourdhui(dateISO) && !estFutur(jourSuivant(dateISO)) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`${base}date=${jourSuivant(dateISO)}`)}
        >
          Jour suivant →
        </Button>
      )}
    </div>
  )
}
