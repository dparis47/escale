'use client'

interface Props {
  anneeMin: number
  anneeMax: number
  anneeSelectionnee: number
}

export function SelecteurAnnee({ anneeMin, anneeMax, anneeSelectionnee }: Props) {
  const annees: number[] = []
  for (let a = anneeMax; a >= anneeMin; a--) annees.push(a)

  return (
    <form method="GET">
      <select
        name="annee"
        defaultValue={anneeSelectionnee}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-md border bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {annees.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </form>
  )
}
