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
  const manquantes = ['Date', 'Thème'].filter((c) => !headers.includes(c))
  if (manquantes.length > 0) {
    return NextResponse.json({ erreur: `Colonnes manquantes : ${manquantes.join(', ')}` }, { status: 400 })
  }

  // Charger les thèmes depuis la DB pour le mapping nom → id
  const themesDB = await prisma.themeAtelierRef.findMany({
    where: { deletedAt: null },
    select: { id: true, nom: true },
  })
  const themesByName = new Map(themesDB.map((t) => [t.nom.toLowerCase(), t]))

  // Charger les prestataires pour le mapping nom → id
  const prestatairesDB = await prisma.prestataire.findMany({
    where: { deletedAt: null },
    select: { id: true, nom: true },
  })
  const prestatairesByName = new Map(prestatairesDB.map((p) => [p.nom.toLowerCase(), p]))

  const erreurs: { ligne: number; message: string }[] = []
  const lignesValides: { ligne: number; data: Record<string, unknown> }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const ligne = i + 2

    const dateStr = parseDate(row['Date'])
    if (!dateStr) {
      erreurs.push({ ligne, message: 'Date manquante ou invalide' })
      continue
    }

    const themeLabel = String(row['Thème'] ?? '').trim().toLowerCase()
    const themeRef = themesByName.get(themeLabel)
    if (!themeRef) {
      erreurs.push({ ligne, message: `Thème inconnu : "${row['Thème']}"` })
      continue
    }

    lignesValides.push({ ligne, data: { ...row, dateStr, themeId: themeRef.id, themeNom: themeRef.nom } })
  }

  // Index des ateliers existants (doublon = même thème + même date)
  const ateliersExistants = await prisma.actionCollective.findMany({
    where: { deletedAt: null },
    select: { id: true, themeId: true, date: true },
  })
  const indexAteliers = new Set(
    ateliersExistants.map((a) => `${a.themeId}|${a.date.toISOString().slice(0, 10)}`)
  )

  let doublons = 0
  let mpisCrees = 0
  const apercu: Record<string, string | number | boolean>[] = []

  for (const { ligne, data } of lignesValides) {
    const dateStr = data.dateStr as string
    const themeId = data.themeId as number
    const cle = `${themeId}|${dateStr}`

    if (indexAteliers.has(cle)) {
      doublons++
      continue
    }

    mpisCrees++

    if (apercu.length < 5) {
      apercu.push({
        date: dateStr,
        theme: data.themeNom as string,
        titre: String(data['Titre'] ?? ''),
      })
    }

    if (!dryRun) {
      try {
        // Résoudre le prestataire
        const prestaLabel = String(data['Prestataire'] ?? '').trim()
        let prestataireId: number | null = null
        if (prestaLabel) {
          const presta = prestatairesByName.get(prestaLabel.toLowerCase())
          if (presta) {
            prestataireId = presta.id
          } else {
            // Créer le prestataire s'il n'existe pas
            const nouveau = await prisma.prestataire.create({ data: { nom: prestaLabel } })
            prestatairesByName.set(prestaLabel.toLowerCase(), nouveau)
            prestataireId = nouveau.id
          }
        }

        await prisma.actionCollective.create({
          data: {
            themeId,
            themeAutre: String(data['Titre'] ?? '').trim() || null,
            prestataireId,
            lieu: String(data['Lieu'] ?? '').trim() || null,
            date: parseISO(dateStr),
            notes: String(data['Notes'] ?? '').trim() || null,
          },
        })
        indexAteliers.add(cle)
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
