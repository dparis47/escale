import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import {
  ARBRE_DEMARCHES,
  champsTheme,
  matchFiltresDemarches,
  fromPrisma,
  colonnesDemarchesExport,
} from '@/lib/demarches'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (!peutAcceder(session, 'tableau_journalier', 'exporter')) return new NextResponse(null, { status: 403 })

  const { searchParams } = new URL(req.url)
  const annee = Number(searchParams.get('annee') ?? new Date().getFullYear())
  const mois  = searchParams.get('mois') // YYYY-MM optionnel
  const themeId   = searchParams.get('theme')
  const champId   = searchParams.get('demarche')
  const q         = searchParams.get('q')?.trim() ?? null

  // Validation des filtres
  const themeFiltre = themeId && ARBRE_DEMARCHES.some((t) => t.id === themeId) ? themeId : null
  const champFiltre = champId && themeFiltre && champsTheme(themeFiltre).includes(champId) ? champId : null
  const recherche   = q && q.length >= 2 ? q : null

  // Période
  let dateDebut: Date
  let dateFin: Date
  let nomFichier: string

  if (mois && /^\d{4}-\d{2}$/.test(mois)) {
    const [a, m] = mois.split('-').map(Number)
    dateDebut = new Date(`${mois}-01T00:00:00.000Z`)
    dateFin = m === 12
      ? new Date(`${a + 1}-01-01T00:00:00.000Z`)
      : new Date(`${a}-${String(m + 1).padStart(2, '0')}-01T00:00:00.000Z`)
    nomFichier = `visites-${mois}`
  } else {
    dateDebut = new Date(`${annee}-01-01T00:00:00.000Z`)
    dateFin   = new Date(`${annee + 1}-01-01T00:00:00.000Z`)
    nomFichier = `visites-${annee}`
  }

  const visitesRaw = await prisma.visit.findMany({
    where: {
      deletedAt: null,
      date: { gte: dateDebut, lt: dateFin },
      ...(recherche
        ? {
            person: {
              OR: [
                { nom:    { contains: recherche, mode: 'insensitive' as const } },
                { prenom: { contains: recherche, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    },
    include: {
      person:    { select: { nom: true, prenom: true, genre: true } },
      demarches: { include: { actionCollective: { select: { themeRef: { select: { nom: true } } } } } },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  // Filtrage par thème/démarche
  const visites = (themeFiltre || champFiltre)
    ? visitesRaw.filter((v) =>
        matchFiltresDemarches(
          v.demarches as unknown as Record<string, unknown> | null,
          themeFiltre,
          champFiltre,
        ),
      )
    : visitesRaw

  // Colonnes de démarches (une par feuille)
  const colsDemarches = colonnesDemarchesExport()

  // Construction du fichier Excel
  const lignes = visites.map((v) => {
    const dem = v.demarches
      ? fromPrisma(v.demarches as unknown as Record<string, unknown>)
      : null

    const dateStr = `${String(v.date.getUTCDate()).padStart(2, '0')}/${String(v.date.getUTCMonth() + 1).padStart(2, '0')}/${v.date.getUTCFullYear()}`

    const row: Record<string, string | number> = {
      'Date':        dateStr,
      'Nom':         v.person.nom,
      'Prénom':      v.person.prenom,
      'Genre':       v.person.genre === 'HOMME' ? 'H' : 'F',
      'Orienté FT':  v.orienteParFT ? 'Oui' : '',
    }

    for (const col of colsDemarches) {
      if (!dem) { row[col.header] = ''; continue }
      const val = dem[col.champ as keyof typeof dem]
      if (col.type === 'bool') {
        row[col.header] = val === true ? 'X' : ''
      } else if (col.type === 'nombre') {
        row[col.header] = typeof val === 'number' ? val : ''
      } else if (col.type === 'texte') {
        row[col.header] = typeof val === 'string' ? val : ''
      } else if (col.type === 'tableau') {
        row[col.header] = Array.isArray(val) ? (val as string[]).join(', ') : ''
      }
    }

    // Nom du thème atelier (si lié à une ActionCollective)
    const demarches = v.demarches as { actionCollective?: { themeRef?: { nom: string } } | null } | null
    row['Thème atelier'] = demarches?.actionCollective?.themeRef?.nom ?? ''

    row['Commentaire'] = v.commentaire ?? ''
    return row
  })

  const ws = XLSX.utils.json_to_sheet(lignes)
  // Largeurs : 5 colonnes fixes + N démarches + thème atelier + commentaire
  const colWidths: { wch: number }[] = [
    { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 5 }, { wch: 10 },
  ]
  for (const col of colsDemarches) {
    colWidths.push({ wch: col.type === 'bool' ? 4 : col.type === 'nombre' ? 6 : 18 })
  }
  colWidths.push({ wch: 24 }) // Thème atelier
  colWidths.push({ wch: 30 }) // Commentaire
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Visites')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomFichier}.xlsx"`,
    },
  })
}
