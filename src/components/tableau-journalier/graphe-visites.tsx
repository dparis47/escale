'use client'

export interface DonneeGraphe {
  label: string
  valeur: number
  reference: number
  actif?: boolean
}

interface Props {
  donnees: DonneeGraphe[]
  hauteur?: number
}

export function GrapheVisites({ donnees, hauteur = 80 }: Props) {
  const maxVal = Math.max(...donnees.map((d) => Math.max(d.valeur, d.reference)), 1)

  return (
    <div className="mb-4">
      <div className="flex items-end gap-[2px]" style={{ height: `${hauteur}px` }}>
        {donnees.map((d, i) => {
          const hVal = (d.valeur / maxVal) * 100
          const hRef = (d.reference / maxVal) * 100
          return (
            <div
              key={i}
              className="group/bar relative flex-1 h-full flex flex-col justify-end"
            >
              {/* Barre de référence (moyenne N-1/N-2) */}
              {d.reference > 0 && (
                <div
                  className="absolute bottom-0 w-full bg-blue-100 rounded-t-sm"
                  style={{ height: `${hRef}%` }}
                />
              )}
              {/* Barre de valeur */}
              {d.valeur > 0 && (
                <div
                  className={`relative z-10 w-full rounded-t-sm ${
                    d.actif ? 'bg-blue-500' : 'bg-blue-300'
                  }`}
                  style={{ height: `${hVal}%`, minHeight: '2px' }}
                />
              )}
              {/* Tooltip au survol */}
              <div className="invisible group-hover/bar:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background shadow-md">
                <span className="font-semibold">{d.valeur}</span>
                {d.reference > 0 && (
                  <span className="text-background/70"> (moy. {d.reference})</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* Labels */}
      <div className="flex gap-[2px] mt-1">
        {donnees.map((d, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[10px] leading-tight ${
              d.actif ? 'font-semibold text-blue-600' : 'text-muted-foreground'
            }`}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}
