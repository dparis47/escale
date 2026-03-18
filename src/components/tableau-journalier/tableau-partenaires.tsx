export const PARTENAIRES_FIXES = [
  { cle: 'TSSI',              label: 'Travailleurs sociaux spécialisés insertion du Département' },
  { cle: 'Job47',             label: 'JOB 47' },
  { cle: 'Acor',              label: 'Acor' },
  { cle: 'Parcours éco futé', label: 'Parcours Eco futé' },
  { cle: 'As CAF',            label: 'Assistante sociale CAF' },
]

const CLES_FIXES = new Set(PARTENAIRES_FIXES.map((p) => p.cle))

export interface JourData {
  dateISO: string
  counts:  Record<string, number>
  total:   number
}

interface Props {
  jours:             JourData[]
  partenairesLibres: string[]
}

function formaterJour(dateISO: string) {
  return new Date(dateISO + 'T00:00:00.000Z').toLocaleDateString('fr-FR', {
    weekday: 'short',
    day:     '2-digit',
    month:   '2-digit',
    timeZone: 'UTC',
  })
}

export function TableauPartenaires({ jours, partenairesLibres }: Props) {
  if (jours.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Aucune donnée partenaire ce mois-ci.
      </p>
    )
  }

  const toutesColonnes = [
    ...PARTENAIRES_FIXES.map((p) => p.cle),
    ...partenairesLibres,
  ]

  // Totaux par colonne
  const totauxColonnes: Record<string, number> = {}
  for (const cle of toutesColonnes) {
    totauxColonnes[cle] = jours.reduce((s, j) => s + (j.counts[cle] ?? 0), 0)
  }
  const grandTotal = jours.reduce((s, j) => s + j.total, 0)

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="text-xs border-collapse">
        <thead className="bg-muted/50 text-xs tracking-wide">
          <tr>
            <th className="whitespace-nowrap border-r-2 border-gray-300 px-2 py-1.5 text-left text-muted-foreground">Date</th>
            {PARTENAIRES_FIXES.map(({ cle, label }) => (
              <th key={cle} className="whitespace-nowrap border-r-2 border-gray-300 px-2 py-1.5 text-center font-semibold text-blue-700">
                {label}
              </th>
            ))}
            {partenairesLibres.map((p) => (
              <th key={p} className="whitespace-nowrap border-r-2 border-gray-300 px-2 py-1.5 text-center italic text-blue-600">
                {p}
              </th>
            ))}
            <th className="whitespace-nowrap px-2 py-1.5 text-center font-semibold text-blue-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {jours.map((jour) => (
            <tr key={jour.dateISO} className="border-t">
              <td className="whitespace-nowrap border-r-2 border-gray-300 px-2 py-1 text-muted-foreground">
                {formaterJour(jour.dateISO)}
              </td>
              {PARTENAIRES_FIXES.map(({ cle }) => (
                <td key={cle} className="border-r-2 border-gray-300 px-2 py-1 text-center tabular-nums">
                  {jour.counts[cle] ?? 0}
                </td>
              ))}
              {partenairesLibres.map((p) => (
                <td key={p} className="border-r-2 border-gray-300 px-2 py-1 text-center tabular-nums">
                  {jour.counts[p] ?? 0}
                </td>
              ))}
              <td className="px-2 py-1 text-center font-semibold tabular-nums">
                {jour.total}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/30">
            <td className="border-r-2 border-gray-300 px-2 py-1.5 font-semibold text-blue-700">Total</td>
            {toutesColonnes.map((cle) => (
              <td key={cle} className="border-r-2 border-gray-300 px-2 py-1.5 text-center font-bold tabular-nums">
                {totauxColonnes[cle]}
              </td>
            ))}
            <td className="px-2 py-1.5 text-center font-bold tabular-nums">{grandTotal}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
