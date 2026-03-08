'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { moisPrecedent, moisSuivant, estMoisFutur, moisAujourdhui } from '@/lib/dates'

interface Props {
  moisISO: string
}

export function NavigationMois({ moisISO }: Props) {
  const router         = useRouter()
  const moisSuivantISO = moisSuivant(moisISO)
  const estMoisCourant = moisISO === moisAujourdhui()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/mois?mois=${moisPrecedent(moisISO)}`)}
      >
        ← Mois précédent
      </Button>

      {!estMoisCourant && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/mois')}
        >
          Mois en cours
        </Button>
      )}

      {!estMoisFutur(moisSuivantISO) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/mois?mois=${moisSuivantISO}`)}
        >
          Mois suivant →
        </Button>
      )}
    </div>
  )
}
