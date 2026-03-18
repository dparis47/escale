'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { estAujourdhui, jourPrecedent, jourSuivant, estFutur, dateAujourdhui } from '@/lib/dates'

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
      <input
        type="date"
        value={dateISO}
        max={dateAujourdhui()}
        onChange={(e) => {
          const val = e.target.value
          if (val && /^\d{4}-\d{2}-\d{2}$/.test(val) && val <= dateAujourdhui()) {
            router.push(`${base}date=${val}`)
          }
        }}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

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
