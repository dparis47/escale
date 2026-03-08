import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte } from '@/lib/dates'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })

  const { searchParams } = new URL(req.url)
  const annee = Number(searchParams.get('annee') ?? new Date().getFullYear())

  const debutAnnee    = new Date(`${annee}-01-01T00:00:00.000Z`)
  const debutSuivante = new Date(`${annee + 1}-01-01T00:00:00.000Z`)

  const personnes = await prisma.personnePartenaire.findMany({
    where: { date: { gte: debutAnnee, lt: debutSuivante }, deletedAt: null },
    orderBy: [{ partenaire: 'asc' }, { date: 'asc' }],
  })

  const lignes = personnes.map((p) => ({
    'Partenaire': p.partenaire,
    'Date':       formaterDateCourte(p.date),
    'Nom':        p.nom,
    'Date RDV':   formaterDateCourte(p.dateRDV),
  }))

  const ws = XLSX.utils.json_to_sheet(lignes)
  ws['!cols'] = [
    { wch: 20 }, // Partenaire
    { wch: 12 }, // Date
    { wch: 24 }, // Nom
    { wch: 12 }, // Date RDV
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Partenaires')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="partenaires-${annee}.xlsx"`,
    },
  })
}
