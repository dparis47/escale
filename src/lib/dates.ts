const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** "2026-02-26" → "jeudi 26 février 2026" */
export function formaterDate(dateISO: string): string {
  const date = parseISO(dateISO)
  const jour = JOURS[date.getUTCDay()]
  return `${jour} ${date.getUTCDate()} ${MOIS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** "2026-02-26T10:30:00.000Z" (Date) → "26/02/2026" */
export function formaterDateCourte(date: Date): string {
  const d = new Date(date)
  const j = String(d.getUTCDate()).padStart(2, '0')
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const a = d.getUTCFullYear()
  return `${j}/${m}/${a}`
}

/** Date → "2026-02-26" */
export function formaterDateISO(date: Date): string {
  const j = String(date.getUTCDate()).padStart(2, '0')
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const a = date.getUTCFullYear()
  return `${a}-${m}-${j}`
}

/** Aujourd'hui en "2026-02-26" (UTC pour cohérence avec @db.Date) */
export function dateAujourdhui(): string {
  return formaterDateISO(new Date())
}

/** "2026-02-26" → Date minuit UTC (pour Prisma @db.Date) */
export function parseISO(dateISO: string): Date {
  return new Date(dateISO + 'T00:00:00.000Z')
}

/** "2026-02-26" → "2026-02-25" */
export function jourPrecedent(dateISO: string): string {
  const date = parseISO(dateISO)
  date.setUTCDate(date.getUTCDate() - 1)
  return formaterDateISO(date)
}

/** "2026-02-26" → "2026-02-27" */
export function jourSuivant(dateISO: string): string {
  const date = parseISO(dateISO)
  date.setUTCDate(date.getUTCDate() + 1)
  return formaterDateISO(date)
}

/** Est-ce que dateISO est aujourd'hui ? */
export function estAujourdhui(dateISO: string): boolean {
  return dateISO === dateAujourdhui()
}

/** Est-ce que dateISO est dans le futur ? */
export function estFutur(dateISO: string): boolean {
  return dateISO > dateAujourdhui()
}
