import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { NIVEAUX_FORMATION_FR } from '@/schemas/accompagnement'
import type { NiveauFormation } from '@prisma/client'

// Inversions des labels FR → enum
const NIVEAUX_INV = Object.fromEntries(
  Object.entries(NIVEAUX_FORMATION_FR).map(([k, v]) => [v.toLowerCase(), k])
)

function parseBool(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false
  const s = String(val).trim().toLowerCase()
  return s === 'oui' || s === '1' || s === 'true' || s === 'x'
}

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
  const manquantes = ['Nom', 'Prénom', 'Date entrée'].filter((c) => !headers.includes(c))
  if (manquantes.length > 0) {
    return NextResponse.json({ erreur: `Colonnes manquantes : ${manquantes.join(', ')}` }, { status: 400 })
  }

  const erreurs: { ligne: number; message: string }[] = []
  const lignesValides: { ligne: number; data: Record<string, unknown> }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const ligne = i + 2

    const nom = String(row['Nom'] ?? '').trim()
    const prenom = String(row['Prénom'] ?? '').trim()
    const dateEntreeStr = parseDate(row['Date entrée'])

    if (!nom || !prenom) {
      erreurs.push({ ligne, message: 'Nom ou prénom manquant' })
      continue
    }
    if (!dateEntreeStr) {
      erreurs.push({ ligne, message: 'Date d\'entrée manquante ou invalide' })
      continue
    }

    lignesValides.push({ ligne, data: { ...row, nom, prenom, dateEntreeStr } })
  }

  // Index des personnes existantes
  const existantes = await prisma.person.findMany({
    where: { deletedAt: null },
    select: { id: true, nom: true, prenom: true },
  })
  const indexPersonnes = new Map<string, number>()
  for (const p of existantes) {
    indexPersonnes.set(`${p.nom.toLowerCase()}|${p.prenom.toLowerCase()}`, p.id)
  }

  // Index des accompagnements existants (pour détecter les doublons)
  const accsExistants = await prisma.accompagnement.findMany({
    where: { deletedAt: null, suiviEI: null },
    select: { id: true, personId: true, dateEntree: true },
  })
  const indexAccs = new Set(
    accsExistants.map((a) => `${a.personId}|${a.dateEntree.toISOString().slice(0, 10)}`)
  )

  let doublons = 0
  let mpisCrees = 0
  const apercu: Record<string, string | number | boolean>[] = []

  for (const { ligne, data } of lignesValides) {
    const nom = data.nom as string
    const prenom = data.prenom as string
    const dateEntreeStr = data.dateEntreeStr as string
    const type = String(data['Type'] ?? 'FSE+').trim()
    const isASID = type.toUpperCase().includes('ASID')
    const cle = `${nom.toLowerCase()}|${prenom.toLowerCase()}`
    let personId = indexPersonnes.get(cle)

    // Vérifier doublon
    if (personId && indexAccs.has(`${personId}|${dateEntreeStr}`)) {
      doublons++
      continue
    }

    mpisCrees++

    if (apercu.length < 5) {
      apercu.push({ nom, prenom, type: isASID ? 'FSE+ ASID' : 'FSE+', dateEntree: dateEntreeStr })
    }

    if (!dryRun) {
      try {
        // Créer la personne si elle n'existe pas
        if (!personId) {
          const personne = await prisma.person.create({
            data: { nom, prenom, genre: 'HOMME', estInscrit: false, dateActualisation: new Date() },
          })
          personId = personne.id
          indexPersonnes.set(cle, personId)
        }

        const dateSortieStr = parseDate(data['Date sortie'])
        const niveauLabel = String(data['Niveau formation'] ?? '').trim().toLowerCase()
        const niveauFormation = NIVEAUX_INV[niveauLabel] ?? null

        const accomp = await prisma.accompagnement.create({
          data: {
            personId,
            dateEntree: parseISO(dateEntreeStr),
            dateSortie: dateSortieStr ? parseISO(dateSortieStr) : null,
            ressourceRSA: parseBool(data['RSA']),
            ressourceASS: parseBool(data['ASS']),
            ressourceARE: parseBool(data['ARE']),
            ressourceAAH: parseBool(data['AAH']),
            ressourceASI: parseBool(data['ASI']),
            ressourceSansRessources: parseBool(data['Sans ressources']),
            niveauFormation: niveauFormation as NiveauFormation | null,
            reconnaissanceHandicap: parseBool(data['Reconnaissance handicap']),
            observation: String(data['Observation'] ?? '').trim() || null,
            estBrouillon: true,
          },
        })

        // Créer les démarches (vides)
        await prisma.demarches.create({ data: { accompagnementId: accomp.id } })

        // Créer SuiviASID si type ASID
        if (isASID) {
          const prescripteurParts = String(data['Prescripteur'] ?? '').trim().split(/\s+/)
          const referentParts = String(data['Référent'] ?? '').trim().split(/\s+/)

          await prisma.suiviASID.create({
            data: {
              accompagnementId: accomp.id,
              prescripteurPrenom: prescripteurParts[0] || null,
              prescripteurNom: prescripteurParts.slice(1).join(' ') || null,
              referentPrenom: referentParts[0] || null,
              referentNom: referentParts.slice(1).join(' ') || null,
              communeResidence: String(data['Commune'] ?? '').trim() || null,
              dateEntree: parseISO(dateEntreeStr),
            },
          })
        }

        indexAccs.add(`${personId}|${dateEntreeStr}`)
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
