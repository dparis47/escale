import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { parseISO } from '@/lib/dates'
import { SITUATIONS_FR, RESSOURCES_FR, ORIENTE_PAR_FR } from '@/schemas/person'
import type { Genre, SituationFamiliale, OrientePar, Ressource } from '@prisma/client'

// Colonnes attendues (identiques au format d'export)
const COLONNES = [
  'Nom', 'Prénom', 'Genre', 'Date de naissance', 'Nationalité',
  'Adresse', 'Téléphone', 'Mobile', 'Email',
  'CSS', 'RQTH', 'Invalidité', 'Catégorie invalidité', 'N° Sécu',
  'N° FT', 'Date inscription FT', 'Code personnel FT', 'Accomp. global FT',
  'N° CAF', 'Situation familiale', 'Nb enfants', 'Âges enfants',
  'Permis', 'Véhicule', 'Autres moyens', 'Hébergement',
  'Ressources', 'Orienté par', 'En ASID',
] as const

// Inversions des labels FR → enum
const SITUATIONS_INV = Object.fromEntries(
  Object.entries(SITUATIONS_FR).map(([k, v]) => [v.toLowerCase(), k])
)
const RESSOURCES_INV = Object.fromEntries(
  Object.entries(RESSOURCES_FR).map(([k, v]) => [v.toLowerCase(), k])
)
const ORIENTE_PAR_INV = Object.fromEntries(
  Object.entries(ORIENTE_PAR_FR).map(([k, v]) => [v.toLowerCase(), k])
)

function parseBool(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false
  const s = String(val).trim().toLowerCase()
  return s === 'oui' || s === '1' || s === 'true' || s === 'x'
}

function parseDate(val: unknown): string | null {
  if (!val) return null
  const s = String(val).trim()
  // Format DD/MM/YYYY
  const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Excel serial number
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
  if (!peutAcceder(session, 'dossiers', 'importer')) return NextResponse.json({ erreur: 'Accès interdit' }, { status: 403 })

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

  // Vérifier que les colonnes obligatoires existent
  if (rows.length === 0) {
    return NextResponse.json({ total: 0, valides: 0, doublons: 0, mpisCrees: 0, misAJour: 0, erreurs: [], apercu: [] })
  }

  const headers = Object.keys(rows[0])
  const manquantes = ['Nom', 'Prénom', 'Genre'].filter((c) => !headers.includes(c))
  if (manquantes.length > 0) {
    return NextResponse.json({ erreur: `Colonnes manquantes : ${manquantes.join(', ')}` }, { status: 400 })
  }

  const erreurs: { ligne: number; message: string }[] = []
  const lignesValides: { ligne: number; data: Record<string, unknown> }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const ligne = i + 2 // +2 pour en-tête + index 0

    const nom = String(row['Nom'] ?? '').trim()
    const prenom = String(row['Prénom'] ?? '').trim()
    const genreRaw = String(row['Genre'] ?? '').trim().toUpperCase()

    if (!nom || !prenom) {
      erreurs.push({ ligne, message: 'Nom ou prénom manquant' })
      continue
    }

    const genre = genreRaw === 'H' || genreRaw === 'HOMME' ? 'HOMME'
                : genreRaw === 'F' || genreRaw === 'FEMME' ? 'FEMME'
                : null
    if (!genre) {
      erreurs.push({ ligne, message: `Genre invalide : "${genreRaw}"` })
      continue
    }

    lignesValides.push({ ligne, data: { ...row, nom, prenom, genre } })
  }

  // Recherche de doublons (personnes existantes)
  const existantes = await prisma.person.findMany({
    where: { deletedAt: null },
    select: { id: true, nom: true, prenom: true },
  })
  const indexExistants = new Map<string, number>()
  for (const p of existantes) {
    indexExistants.set(`${p.nom.toLowerCase()}|${p.prenom.toLowerCase()}`, p.id)
  }

  let doublons = 0
  let mpisCrees = 0
  let misAJour = 0
  const apercu: Record<string, string | number | boolean>[] = []

  for (const { ligne, data } of lignesValides) {
    const nom = data.nom as string
    const prenom = data.prenom as string
    const genre = data.genre as string
    const cle = `${nom.toLowerCase()}|${prenom.toLowerCase()}`
    const existeId = indexExistants.get(cle)

    if (existeId) {
      misAJour++
    } else {
      mpisCrees++
    }

    if (apercu.length < 5) {
      apercu.push({
        nom,
        prenom,
        genre,
        existe: !!existeId,
      })
    }

    if (!dryRun) {
      try {
        const dateNaissance = parseDate(data['Date de naissance'])
        const dateInscriptionFT = parseDate(data['Date inscription FT'])
        const situationLabel = String(data['Situation familiale'] ?? '').trim().toLowerCase()
        const situationFamiliale = SITUATIONS_INV[situationLabel] ?? null
        const orienteParLabel = String(data['Orienté par'] ?? '').trim().toLowerCase()
        const orientePar = ORIENTE_PAR_INV[orienteParLabel] ?? null
        const ressourcesRaw = String(data['Ressources'] ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
        const ressources = ressourcesRaw.map((r) => RESSOURCES_INV[r]).filter(Boolean)
        const agesRaw = String(data['Âges enfants'] ?? '').split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))

        const personData = {
          nom,
          prenom,
          genre: genre as Genre,
          dateNaissance: dateNaissance ? parseISO(dateNaissance) : null,
          nationalite: String(data['Nationalité'] ?? '').trim() || null,
          adresse: String(data['Adresse'] ?? '').trim() || null,
          telephone: String(data['Téléphone'] ?? '').trim() || null,
          mobile: String(data['Mobile'] ?? '').trim() || null,
          email: String(data['Email'] ?? '').trim() || null,
          css: parseBool(data['CSS']),
          rqth: parseBool(data['RQTH']),
          invalidite: parseBool(data['Invalidité']),
          categorieInvalidite: String(data['Catégorie invalidité'] ?? '').trim() || null,
          numeroSecu: String(data['N° Sécu'] ?? '').trim() || null,
          numeroFT: String(data['N° FT'] ?? '').trim() || null,
          dateInscriptionFT: dateInscriptionFT ? parseISO(dateInscriptionFT) : null,
          codepersonnelFT: String(data['Code personnel FT'] ?? '').trim() || null,
          accoGlo: parseBool(data['Accomp. global FT']),
          numeroCAF: String(data['N° CAF'] ?? '').trim() || null,
          situationFamiliale: situationFamiliale as SituationFamiliale | null,
          nombreEnfantsCharge: data['Nb enfants'] ? Number(data['Nb enfants']) || 0 : null,
          agesEnfants: agesRaw,
          permisConduire: parseBool(data['Permis']),
          vehiculePersonnel: parseBool(data['Véhicule']),
          autresMoyensLocomotion: String(data['Autres moyens'] ?? '').trim() || null,
          hebergement: String(data['Hébergement'] ?? '').trim() || null,
          ressources: ressources as Ressource[],
          orientePar: orientePar as OrientePar | null,
          enASID: parseBool(data['En ASID']),
        }

        if (existeId) {
          // Mise à jour : ne remplacer que les champs non vides
          const updateData: Record<string, unknown> = {}
          for (const [key, val] of Object.entries(personData)) {
            if (key === 'nom' || key === 'prenom' || key === 'genre') continue
            if (val !== null && val !== '' && val !== false && !(Array.isArray(val) && val.length === 0)) {
              updateData[key] = val
            }
          }
          if (Object.keys(updateData).length > 0) {
            await prisma.person.update({ where: { id: existeId }, data: updateData })
          }
        } else {
          const personne = await prisma.person.create({
            data: {
              ...personData,
              estInscrit: true,
              dateActualisation: new Date(),
            },
          })
          // Auto-création du dossier individuel
          const accompDI = await prisma.accompagnement.create({
            data: { personId: personne.id, dateEntree: new Date() },
          })
          await prisma.demarches.create({ data: { accompagnementId: accompDI.id } })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma as any).suiviEI.create({ data: { accompagnementId: accompDI.id } })
          indexExistants.set(cle, personne.id)
        }
      } catch (e) {
        erreurs.push({ ligne, message: `Erreur lors de l'import : ${e instanceof Error ? e.message : String(e)}` })
      }
    }
  }

  return NextResponse.json({
    total: rows.length,
    valides: lignesValides.length,
    doublons,
    mpisCrees,
    misAJour,
    erreurs,
    apercu: dryRun ? apercu : undefined,
  })
}
