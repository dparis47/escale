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

/** Mois courant en "2026-03" */
export function moisAujourdhui(): string {
  const now = new Date()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${now.getUTCFullYear()}-${m}`
}

/** "2026-03" → "2026-02" */
export function moisPrecedent(moisISO: string): string {
  const [annee, mois] = moisISO.split('-').map(Number)
  if (mois === 1) return `${annee - 1}-12`
  return `${annee}-${String(mois - 1).padStart(2, '0')}`
}

/** "2026-03" → "2026-04" */
export function moisSuivant(moisISO: string): string {
  const [annee, mois] = moisISO.split('-').map(Number)
  if (mois === 12) return `${annee + 1}-01`
  return `${annee}-${String(mois + 1).padStart(2, '0')}`
}

/** Est-ce que moisISO est dans le futur (après le mois courant) ? */
export function estMoisFutur(moisISO: string): boolean {
  return moisISO > moisAujourdhui()
}

/** "2026-03" → "mars 2026" (fr-FR) */
export function formaterMois(moisISO: string): string {
  return new Date(`${moisISO}-01T00:00:00.000Z`).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** "marie" → "Marie", "MARIE-CLAIRE" → "Marie-Claire" */
export function capitaliserPrenom(prenom: string): string {
  return prenom
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('-')
}
