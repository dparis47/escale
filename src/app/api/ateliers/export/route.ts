import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte } from '@/lib/dates'
import { peutAcceder } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (!peutAcceder(session, 'ateliers', 'exporter')) return new NextResponse(null, { status: 403 })

  const ateliers = await prisma.actionCollective.findMany({
    where: { deletedAt: null },
    include: {
      themeRef: { include: { categorie: true } },
      prestataire: true,
    },
    orderBy: { date: 'asc' },
  })

  // Comptage participants depuis le tableau journalier
  type CompteurRow = { id: bigint; total: bigint }
  const compteurRows = ateliers.length > 0
    ? await prisma.$queryRaw<CompteurRow[]>(Prisma.sql`
        SELECT
          ac.id,
          COUNT(DISTINCT v."personId") FILTER (WHERE d."atelierParticipation" = true AND d."actionCollectiveId" = ac.id) AS total
        FROM "ActionCollective" ac
        LEFT JOIN "Visit" v
          ON  v.date        = ac.date
          AND v."deletedAt" IS NULL
        LEFT JOIN "Demarches" d ON d."visitId" = v.id
        WHERE ac.id         IN (${Prisma.join(ateliers.map((a) => a.id))})
          AND ac."deletedAt" IS NULL
        GROUP BY ac.id
      `)
    : []
  const compteurParAtelier = new Map(compteurRows.map((r) => [Number(r.id), Number(r.total)]))

  const lignes = ateliers.map((a) => ({
    'Date':          formaterDateCourte(a.date),
    'Catégorie':     a.themeRef.categorie.nom,
    'Thème':         a.themeRef.nom,
    'Titre':         a.themeAutre ?? '',
    'Prestataire':   a.prestataire?.nom ?? '',
    'Lieu':          a.lieu ?? '',
    'Participants':  compteurParAtelier.get(a.id) ?? 0,
    'Notes':         a.notes ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(lignes)
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 22 }, // Catégorie
    { wch: 20 }, // Thème
    { wch: 20 }, // Titre
    { wch: 20 }, // Prestataire
    { wch: 16 }, // Lieu
    { wch: 12 }, // Participants
    { wch: 30 }, // Notes
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ateliers')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="ateliers.xlsx"',
    },
  })
}
