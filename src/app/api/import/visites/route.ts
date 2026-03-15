import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { parseISO } from '@/lib/dates'
import {
  DEMARCHE_VIDE,
  colonnesDemarchesExport,
  type DemarcheChamps,
} from '@/lib/demarches'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseExcelDate(val: unknown): string | null {
  if (!val && val !== 0) return null
  if (val instanceof Date) {
    const adjusted = new Date(val.getTime() + 12 * 60 * 60 * 1000)
    const y = adjusted.getUTCFullYear()
    const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0')
    const d = String(adjusted.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(val).trim()
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const num = Number(s)
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000)
    return d.toISOString().slice(0, 10)
  }
  return null
}

function parseGenre(val: unknown): 'HOMME' | 'FEMME' | null {
  const s = String(val ?? '').trim().toUpperCase()
  if (s === 'H' || s === 'M' || s === 'HOMME') return 'HOMME'
  if (s === 'F' || s === 'FEMME')              return 'FEMME'
  return null
}

function boolVal(val: unknown): boolean {
  if (typeof val === 'boolean') return val
  const s = String(val ?? '').trim().toLowerCase()
  return s === '1' || s === 'x' || s === 'oui' || s === 'true'
}

function strCol(row: Record<string, unknown>, header: string | undefined): string {
  if (!header) return ''
  return String(row[header] ?? '').trim()
}

// ── Détection du format legacy ────────────────────────────────────────────────

function normaliser(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

const COL_PATTERNS: { cle: string; pattern: RegExp }[] = [
  { cle: 'DATE',            pattern: /^date$/ },
  { cle: 'GENRE',           pattern: /^genre$/ },
  { cle: 'NOM',             pattern: /^noms?$/ },
  { cle: 'PRENOM',          pattern: /^prenoms?$/ },
  { cle: 'MSA_CAF',         pattern: /msa|caf/ },
  { cle: 'SANTE',           pattern: /^sante$/ },
  { cle: 'PASS',            pattern: /^pass$/ },
  { cle: 'LOGEMENT',        pattern: /^logement$/ },
  { cle: 'MOBILITE',        pattern: /^mobilite$/ },
  { cle: 'CV_LM',           pattern: /^cvlm$|cvlm/ },
  { cle: 'EMPLOI',          pattern: /^emploirecher|emploirecherches/ },
  { cle: 'INSCRIPTION_FT',  pattern: /inscript/ },
  { cle: 'ORIENTE_FT',      pattern: /orient.*ft|orient.*france/ },
  { cle: 'CREA_FT',         pattern: /crea|creat.*compte/ },
  { cle: 'ACC_NUM',         pattern: /accompagnementnumer|numeraccump/ },
  { cle: 'INTERNET',        pattern: /^internet$/ },
  { cle: 'INFO_CONSEIL',    pattern: /infoconseil|conseil/ },
  { cle: 'AUTRES',          pattern: /^autres$/ },
  { cle: 'LIEN_SOCIAL',     pattern: /liensocial|social/ },
  { cle: 'ATELIERS',        pattern: /^ateliers$/ },
  { cle: 'THEME_ATELIER',   pattern: /themeatelier|thematelier|nomatel/ },
  { cle: 'COURS_INFO',      pattern: /coursinfo|coursinformatique|informatique/ },
  { cle: 'ASID',            pattern: /^asid$/ },
  { cle: 'COMMENTAIRE',     pattern: /comment/ },
]

function detecterColonnesLegacy(headers: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const h of headers) {
    const norm = normaliser(h)
    for (const { cle, pattern } of COL_PATTERNS) {
      if (map.has(cle)) continue
      if (pattern.test(norm)) { map.set(cle, h); break }
    }
  }
  return map
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LigneImport {
  ligne:        number
  date:         string
  nom:          string
  prenom:       string
  genre:        'HOMME' | 'FEMME'
  orienteParFT: boolean
  commentaire:  string
  demarches:    DemarcheChamps
  asid:         boolean
  themeAtelier: string
}

interface ResultatImport {
  total:             number
  valides:           number
  personnesMatchees: number
  personnesACreer:   number
  doublons:          number
  asidBrouillons:    number
  erreurs:           { ligne: number; message: string }[]
  apercu?:           LigneImport[]
}

// ── Parsing : nouveau format (une colonne par démarche) ──────────────────────

function parseNouveauFormat(
  rows: Record<string, unknown>[],
  headers: string[],
): { lignes: LigneImport[]; erreurs: { ligne: number; message: string }[] } {
  // Construire le mapping header → { champ, type }
  const colsDemarches = colonnesDemarchesExport()
  const headerMap = new Map<string, { champ: string; type: 'bool' | 'nombre' | 'texte' | 'tableau' }>()
  for (const col of colsDemarches) {
    headerMap.set(col.header, { champ: col.champ, type: col.type })
  }

  // Trouver les headers fixes
  const hDate     = headers.find((h) => h === 'Date') ?? headers.find((h) => normaliser(h) === 'date')
  const hNom      = headers.find((h) => h === 'Nom') ?? headers.find((h) => normaliser(h).match(/^noms?$/))
  const hPrenom   = headers.find((h) => h === 'Prénom') ?? headers.find((h) => normaliser(h).match(/^prenoms?$/))
  const hGenre    = headers.find((h) => h === 'Genre') ?? headers.find((h) => normaliser(h) === 'genre')
  const hOrientFT = headers.find((h) => h === 'Orienté FT')
  const hComment  = headers.find((h) => h === 'Commentaire') ?? headers.find((h) => normaliser(h).match(/comment/))
  const hThemeAtelier = headers.find((h) => h === 'Thème atelier') ?? headers.find((h) => normaliser(h).match(/themeatelier/))

  // Trouver les colonnes de démarches présentes dans le fichier
  const colonnesPresentes: { header: string; champ: string; type: 'bool' | 'nombre' | 'texte' | 'tableau' }[] = []
  for (const h of headers) {
    const info = headerMap.get(h)
    if (info) colonnesPresentes.push({ header: h, ...info })
  }

  const lignes: LigneImport[] = []
  const erreurs: { ligne: number; message: string }[] = []
  let derniereDate: string | null = null

  rows.forEach((row, idx) => {
    const numLigne = idx + 2

    const dateBrute = parseExcelDate(hDate ? row[hDate] : '')
    if (dateBrute) derniereDate = dateBrute
    const dateStr = dateBrute ?? derniereDate

    if (!dateStr) {
      erreurs.push({ ligne: numLigne, message: 'Date manquante ou invalide' })
      return
    }

    const genre = parseGenre(hGenre ? row[hGenre] : '')
    if (!genre) {
      erreurs.push({ ligne: numLigne, message: `Genre invalide : "${hGenre ? String(row[hGenre] ?? '') : ''}"` })
      return
    }

    const nom    = strCol(row, hNom).toUpperCase() || 'ANONYME'
    const prenom = strCol(row, hPrenom) || ''
    const commentaire = strCol(row, hComment)

    // Remplir les démarches
    const demarches: DemarcheChamps = { ...DEMARCHE_VIDE }

    for (const col of colonnesPresentes) {
      const val = row[col.header]
      if (col.type === 'bool') {
        (demarches[col.champ as keyof DemarcheChamps] as boolean) = boolVal(val)
      } else if (col.type === 'nombre') {
        const n = Number(val)
        ;(demarches[col.champ as keyof DemarcheChamps] as number | null) = isNaN(n) ? null : n
      } else if (col.type === 'texte') {
        const s = String(val ?? '').trim()
        ;(demarches[col.champ as keyof DemarcheChamps] as string | null) = s || null
      }
    }

    lignes.push({
      ligne: numLigne,
      date: dateStr,
      nom,
      prenom,
      genre,
      orienteParFT: hOrientFT ? boolVal(row[hOrientFT]) : false,
      commentaire,
      demarches,
      asid: false,
      themeAtelier: strCol(row, hThemeAtelier),
    })
  })

  return { lignes, erreurs }
}

// ── Parsing : format legacy ──────────────────────────────────────────────────

function parseLegacyFormat(
  rows: Record<string, unknown>[],
  headers: string[],
): { lignes: LigneImport[]; erreurs: { ligne: number; message: string }[] } {
  const cols = detecterColonnesLegacy(headers)

  const lignes: LigneImport[] = []
  const erreurs: { ligne: number; message: string }[] = []
  let derniereDate: string | null = null

  rows.forEach((row, idx) => {
    const numLigne = idx + 2

    const dateBrute = parseExcelDate(cols.has('DATE') ? row[cols.get('DATE')!] : '')
    if (dateBrute) derniereDate = dateBrute
    const dateStr = dateBrute ?? derniereDate

    if (!dateStr) {
      erreurs.push({ ligne: numLigne, message: 'Date manquante ou invalide' })
      return
    }

    const genre = parseGenre(cols.has('GENRE') ? row[cols.get('GENRE')!] : '')
    if (!genre) {
      erreurs.push({ ligne: numLigne, message: `Genre invalide : "${strCol(row, cols.get('GENRE'))}"` })
      return
    }

    const nom    = strCol(row, cols.get('NOM')).toUpperCase() || 'ANONYME'
    const prenom = strCol(row, cols.get('PRENOM')) || ''
    const commentaire = strCol(row, cols.get('COMMENTAIRE'))
    const themeAtelier = strCol(row, cols.get('THEME_ATELIER'))
    const estAtelier  = themeAtelier !== '' || boolVal(cols.has('ATELIERS') ? row[cols.get('ATELIERS')!] : '')
    const autresFlag  = boolVal(cols.has('AUTRES') ? row[cols.get('AUTRES')!] : '')

    const demarches: DemarcheChamps = {
      ...DEMARCHE_VIDE,
      droitsCafMsa:            boolVal(cols.has('MSA_CAF') ? row[cols.get('MSA_CAF')!] : ''),
      santeAccesSoins:         boolVal(cols.has('SANTE') ? row[cols.get('SANTE')!] : ''),
      santeRendezVousPASS:     boolVal(cols.has('PASS') ? row[cols.get('PASS')!] : ''),
      logementRecherche:       boolVal(cols.has('LOGEMENT') ? row[cols.get('LOGEMENT')!] : ''),
      mobilitCarteSolidaire:   boolVal(cols.has('MOBILITE') ? row[cols.get('MOBILITE')!] : ''),
      emploiCvLm:              boolVal(cols.has('CV_LM') ? row[cols.get('CV_LM')!] : ''),
      emploiRechercheEmploi:   boolVal(cols.has('EMPLOI') ? row[cols.get('EMPLOI')!] : ''),
      emploiInscriptionFT:     boolVal(cols.has('INSCRIPTION_FT') ? row[cols.get('INSCRIPTION_FT')!] : ''),
      emploiEspaceFT:          boolVal(cols.has('CREA_FT') ? row[cols.get('CREA_FT')!] : ''),
      numeriqueAccompagnement: boolVal(cols.has('ACC_NUM') ? row[cols.get('ACC_NUM')!] : ''),
      numeriqueEspaceNumerique: boolVal(cols.has('INTERNET') ? row[cols.get('INTERNET')!] : ''),
      numeriqueCoursInfo:      boolVal(cols.has('COURS_INFO') ? row[cols.get('COURS_INFO')!] : ''),
      autresInfoConseil:       boolVal(cols.has('INFO_CONSEIL') ? row[cols.get('INFO_CONSEIL')!] : ''),
      autresInput:             autresFlag ? 'Autres' : null,
      isolementLienSocial:     boolVal(cols.has('LIEN_SOCIAL') ? row[cols.get('LIEN_SOCIAL')!] : ''),
      atelierParticipation:    estAtelier,
      actionCollectiveId:      null,
    }

    lignes.push({
      ligne: numLigne,
      date: dateStr,
      nom,
      prenom,
      genre,
      orienteParFT: boolVal(cols.has('ORIENTE_FT') ? row[cols.get('ORIENTE_FT')!] : ''),
      commentaire,
      demarches,
      asid: boolVal(cols.has('ASID') ? row[cols.get('ASID')!] : ''),
      themeAtelier,
    })
  })

  return { lignes, erreurs }
}

// ── Parsing principal ─────────────────────────────────────────────────────────

function parseExcel(buffer: ArrayBuffer): { lignes: LigneImport[]; erreurs: { ligne: number; message: string }[] } {
  const wb   = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  if (rows.length === 0) return { lignes: [], erreurs: [] }

  const headers = Object.keys(rows[0])

  // Détecter le format : nouveau si au moins un header contient « — » (tiret cadratin)
  const estNouveauFormat = headers.some((h) => h.includes('—'))

  return estNouveauFormat
    ? parseNouveauFormat(rows, headers)
    : parseLegacyFormat(rows, headers)
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'tableau_journalier', 'importer')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const url     = new URL(request.url)
  const dryRun  = url.searchParams.get('dry_run') === 'true'

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const fichier = formData.get('fichier')
  if (!fichier || typeof fichier === 'string') {
    return NextResponse.json({ erreur: 'Fichier manquant' }, { status: 400 })
  }

  const buffer = await (fichier as Blob).arrayBuffer()
  const { lignes, erreurs } = parseExcel(buffer)

  if (lignes.length === 0) {
    const resultat: ResultatImport = { total: 0, valides: 0, personnesMatchees: 0, personnesACreer: 0, doublons: 0, asidBrouillons: 0, erreurs }
    return NextResponse.json(resultat)
  }

  // ── Mode preview (dry_run) ──────────────────────────────────────────────────
  if (dryRun) {
    const cles = [...new Set(lignes.map((l) => `${l.nom}||${l.prenom.toLowerCase()}`))]
    const personnesExistantes = await prisma.person.findMany({
      where: {
        deletedAt: null,
        OR: cles.map((k) => {
          const [nom, prenom] = k.split('||')
          return { nom, prenom: { equals: prenom, mode: 'insensitive' as const } }
        }),
      },
      select: { id: true, nom: true, prenom: true },
    })
    const setPers = new Set(personnesExistantes.map((p) => `${p.nom}||${p.prenom.toLowerCase()}`))

    const visitesExistantes = await prisma.$queryRaw<{ personId: number; date: string }[]>`
      SELECT v."personId", TO_CHAR(v.date, 'YYYY-MM-DD') AS date
      FROM "Visit" v
      INNER JOIN "Person" p ON p.id = v."personId"
      WHERE v."deletedAt" IS NULL
        AND p.nom = ANY(${lignes.map((l) => l.nom)})
    `
    const setVisites = new Set(visitesExistantes.map((v) => `${v.personId}||${v.date}`))

    const personIdsConnus = personnesExistantes.map((p) => p.id)
    const accoExistants   = personIdsConnus.length > 0
      ? await prisma.accompagnement.findMany({
          where:  { personId: { in: personIdsConnus }, deletedAt: null },
          select: { personId: true },
        })
      : []
    const setAcco = new Set(accoExistants.map((a) => a.personId))

    let matchees = 0; let aCreer = 0; let doublons = 0; let asidBrouillons = 0
    const personnesVues = new Set<string>()
    const asidCreesSimul = new Set<string>()

    for (const l of lignes) {
      const cle = `${l.nom}||${l.prenom.toLowerCase()}`
      const existe = setPers.has(cle)
      if (!personnesVues.has(cle)) {
        if (existe) matchees++; else aCreer++
        personnesVues.add(cle)
      }

      if (existe) {
        const p = personnesExistantes.find((x) => x.nom === l.nom && x.prenom.toLowerCase() === l.prenom.toLowerCase())
        if (p && setVisites.has(`${p.id}||${l.date}`)) { doublons++; continue }
      }

      if (l.asid) {
        if (!asidCreesSimul.has(cle)) {
          const p = personnesExistantes.find((x) => x.nom === l.nom && x.prenom.toLowerCase() === l.prenom.toLowerCase())
          if (!p || !setAcco.has(p.id)) {
            asidBrouillons++
            asidCreesSimul.add(cle)
          }
        }
      }
    }

    const resultat: ResultatImport = {
      total:             lignes.length + erreurs.length,
      valides:           lignes.length,
      personnesMatchees: matchees,
      personnesACreer:   aCreer,
      doublons,
      asidBrouillons,
      erreurs,
      apercu:            lignes.slice(0, 5),
    }
    return NextResponse.json(resultat)
  }

  // ── Mode import réel ────────────────────────────────────────────────────────
  let importees = 0; let doublons = 0; let asidBrouillons = 0
  const erreursImport: { ligne: number; message: string }[] = [...erreurs]

  const cachePersonnes = new Map<string, number>()
  const asidCrees = new Set<number>()

  for (const l of lignes) {
    try {
      const cleP = `${l.nom}||${l.prenom.toLowerCase()}`

      // 1. Trouver ou créer la Person
      let personId: number
      if (cachePersonnes.has(cleP)) {
        personId = cachePersonnes.get(cleP)!
      } else {
        const existante = await prisma.person.findFirst({
          where:  { deletedAt: null, nom: l.nom, prenom: { equals: l.prenom, mode: 'insensitive' } },
          select: { id: true },
        })
        if (existante) {
          personId = existante.id
        } else {
          const nouvelle = await prisma.person.create({
            data: { nom: l.nom, prenom: l.prenom, genre: l.genre, estInscrit: false },
          })
          personId = nouvelle.id
        }
        cachePersonnes.set(cleP, personId)
      }

      // 2. Vérifier doublon visite
      const visitExistante = await prisma.visit.findFirst({
        where: { personId, date: parseISO(l.date), deletedAt: null },
      })
      if (visitExistante) { doublons++; continue }

      // 3. Résoudre le thème atelier si renseigné
      let actionCollectiveId: number | null = null
      if (l.themeAtelier) {
        const themeRef = await prisma.themeAtelierRef.findFirst({
          where: {
            nom: { equals: l.themeAtelier, mode: 'insensitive' },
            deletedAt: null,
          },
        })
        if (themeRef) {
          const dateVisite = parseISO(l.date)
          // Chercher une séance existante ce jour-là pour ce thème
          const seanceExistante = await prisma.actionCollective.findFirst({
            where: { themeId: themeRef.id, date: dateVisite, deletedAt: null },
          })
          if (seanceExistante) {
            actionCollectiveId = seanceExistante.id
          } else {
            const nouvelle = await prisma.actionCollective.create({
              data: { themeId: themeRef.id, date: dateVisite },
            })
            actionCollectiveId = nouvelle.id
          }
        }
      }

      // 4. Créer Visit + Demarches
      const visite = await prisma.visit.create({
        data: {
          date:        parseISO(l.date),
          personId,
          orienteParFT: l.orienteParFT,
          commentaire:  l.commentaire || null,
          saisieParId:  Number(session.user.id),
          demarches: {
            create: {
              ...l.demarches,
              atelierParticipation: l.demarches.atelierParticipation || actionCollectiveId !== null,
              actionCollectiveId,
            },
          },
        },
      })

      // 5. Enregistrer la participation atelier
      if (actionCollectiveId && personId) {
        await prisma.participationAtelier.upsert({
          where: {
            actionCollectiveId_personId: {
              actionCollectiveId,
              personId,
            },
          },
          update: { deletedAt: null },
          create: { actionCollectiveId, personId },
        })
      }

      importees++

      // 6. Créer AccompagnementASID brouillon si ASID = 1
      if (l.asid && !asidCrees.has(personId)) {
        const accoExistant = await prisma.accompagnement.findFirst({
          where: { personId, deletedAt: null },
        })
        if (!accoExistant) {
          const acco = await prisma.accompagnement.create({
            data: {
              personId,
              dateEntree:   parseISO(l.date),
              estBrouillon: true,
            },
          })
          await prisma.suiviASID.create({
            data: {
              accompagnementId: acco.id,
              dateEntree:       parseISO(l.date),
            },
          })
          asidBrouillons++
        }
        asidCrees.add(personId)
      }
    } catch (err) {
      erreursImport.push({ ligne: l.ligne, message: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
  }

  const resultat: ResultatImport = {
    total:             lignes.length + erreurs.length,
    valides:           importees + doublons,
    personnesMatchees: 0,
    personnesACreer:   0,
    doublons,
    asidBrouillons,
    erreurs:           erreursImport,
  }
  return NextResponse.json(resultat)
}
