import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formaterDate, formaterMois, estAujourdhui } from '@/lib/dates'

type Vue = 'journaliere' | 'mensuelle' | 'annuelle'

interface Props {
  vue:     Vue
  annee:   number
  moisISO: string  // "2026-03" — toujours fourni
  dateISO: string  // "2026-03-07" — toujours fourni
}

export function BreadcrumbVues({ vue, annee, moisISO, dateISO }: Props) {
  const labelJour = estAujourdhui(dateISO)
    ? "Aujourd'hui"
    : formaterDate(dateISO)

  return (
    <div className="flex items-center gap-1">
      {/* Bouton Annuel */}
      {vue === 'annuelle' ? (
        <Button variant="default" size="sm" className="pointer-events-none">
          {annee}
        </Button>
      ) : (
        <Link href={`/annee?annee=${annee}`}>
          <Button variant="outline" size="sm">{annee}</Button>
        </Link>
      )}

      {/* Bouton Mensuel */}
      {vue === 'mensuelle' ? (
        <Button variant="default" size="sm" className="pointer-events-none capitalize">
          {formaterMois(moisISO)}
        </Button>
      ) : (
        <Link href={`/mois?mois=${moisISO}`}>
          <Button variant="outline" size="sm" className="capitalize">
            {formaterMois(moisISO)}
          </Button>
        </Link>
      )}

      {/* Bouton Journalier */}
      {vue === 'journaliere' ? (
        <Button variant="default" size="sm" className="pointer-events-none capitalize">
          {formaterDate(dateISO)}
        </Button>
      ) : (
        <Link href={`/?date=${dateISO}`}>
          <Button variant="outline" size="sm" className="capitalize">
            {labelJour}
          </Button>
        </Link>
      )}
    </div>
  )
}
