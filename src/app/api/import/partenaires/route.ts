import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'

function parseDate(val: unknown): string | null {
  if (!val) return null
  const s = String(val).trim()
  const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d+$/.test(s)) {
    const serial = Number(s)
    if (serial > 1 && serial < 100000) {
      const d = new Date((serial - 25569) * 86400000 + 43200000)
      const j = String(d.getUTCDate()).padStart(2, '0')
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      return `${d.getUTCFullYear()}-${m}-${j}`
    }
  }
  return null
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') return NextResponse.json({ erreur: 'Accès interdit' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const dryRun = searchParams.get('dry_run') === 'true'

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ erreur: 'Données invalides' }, { status: 400 })
  }

  const fichier = formData.get('fichier') as File | null
  if (!fichier) return NextResponse.json({ erreur: 'Fichier manquant' }, { status: 400 })

  const buffer = Buffer.from(await fichier.arrayBuffer())
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return NextResponse.json({ erreur: 'Feuille vide' }, { status: 400 })

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

  if (rows.length === 0) {
    return NextResponse.json({ total: 0, valides: 0, doublons: 0, mpisCrees: 0, misAJour: 0, erreurs: [], apercu: [] })
  }

  const headers = Object.keys(rows[0])
  const manquantes = ['Partenaire', 'Date', 'Nom', 'Date RDV'].filter((c) => !headers.includes(c))
  if (manquantes.length > 0) {
    return NextResponse.json({ erreur: `Colonnes manquantes : ${manquantes.join(', ')}` }, { status: 400 })
  }

  const erreurs: { ligne: number; message: string }[] = []
  const lignesValides: { ligne: number; data: Record<string, unknown> }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const ligne = i + 2

    const partenaire = String(row['Partenaire'] ?? '').trim()
    const dateStr = parseDate(row['Date'])
    const nom = String(row['Nom'] ?? '').trim()
    const dateRDVStr = parseDate(row['Date RDV'])

    if (!partenaire) {
      erreurs.push({ ligne, message: 'Partenaire manquant' })
      continue
    }
    if (!dateStr) {
      erreurs.push({ ligne, message: 'Date manquante ou invalide' })
      continue
    }
    if (!nom) {
      erreurs.push({ ligne, message: 'Nom manquant' })
      continue
    }
    if (!dateRDVStr) {
      erreurs.push({ ligne, message: 'Date RDV manquante ou invalide' })
      continue
    }

    lignesValides.push({ ligne, data: { partenaire, dateStr, nom, dateRDVStr } })
  }

  // Index des entrées existantes (doublon = partenaire + date + nom)
  const existants = await prisma.personnePartenaire.findMany({
    where: { deletedAt: null },
    select: { partenaire: true, date: true, nom: true },
  })
  const indexExistants = new Set(
    existants.map((e) => `${e.partenaire.toLowerCase()}|${e.date.toISOString().slice(0, 10)}|${e.nom.toLowerCase()}`)
  )

  let doublons = 0
  let mpisCrees = 0
  const apercu: Record<string, string | number | boolean>[] = []

  for (const { ligne, data } of lignesValides) {
    const partenaire = data.partenaire as string
    const dateStr = data.dateStr as string
    const nom = data.nom as string
    const dateRDVStr = data.dateRDVStr as string
    const cle = `${partenaire.toLowerCase()}|${dateStr}|${nom.toLowerCase()}`

    if (indexExistants.has(cle)) {
      doublons++
      continue
    }

    mpisCrees++

    if (apercu.length < 5) {
      apercu.push({ partenaire, date: dateStr, nom, dateRDV: dateRDVStr })
    }

    if (!dryRun) {
      try {
        await prisma.personnePartenaire.create({
          data: {
            partenaire,
            date: parseISO(dateStr),
            nom,
            dateRDV: parseISO(dateRDVStr),
          },
        })
        indexExistants.add(cle)
      } catch (e) {
        erreurs.push({ ligne, message: `Erreur : ${e instanceof Error ? e.message : String(e)}` })
      }
    }
  }

  return NextResponse.json({
    total: rows.length,
    valides: lignesValides.length,
    doublons,
    mpisCrees,
    misAJour: 0,
    erreurs,
    apercu: dryRun ? apercu : undefined,
  })
}
