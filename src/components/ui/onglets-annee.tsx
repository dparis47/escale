import Link from 'next/link'

interface OngletsAnneeProps {
  annees: number[]
  anneeActive: number
  baseUrl: string
  /** Autres query params à conserver (ex: { q: 'test', page: '1' }) */
  autresParams?: Record<string, string>
}

export function OngletsAnnee({ annees, anneeActive, baseUrl, autresParams = {} }: OngletsAnneeProps) {
  if (annees.length <= 1) return null

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {[...annees].reverse().map((annee) => {
        const params = new URLSearchParams({ ...autresParams, annee: String(annee) })
        const isActive = annee === anneeActive

        return (
          <Link
            key={annee}
            href={`${baseUrl}?${params.toString()}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {annee}
          </Link>
        )
      })}
    </div>
  )
}
