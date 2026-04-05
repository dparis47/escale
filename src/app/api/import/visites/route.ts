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
  { cle: 'ATELIERS',        pattern: /^ateliers?$/ },
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

const NOM_VALIDE = /^[A-Za-zÀ-ÿ\s\-''?]+$/

function nomValide(s: string): boolean {
  return s.trim().length > 0 && NOM_VALIDE.test(s.trim())
}

// ── Similarité de noms ───────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const val = Math.min(dp[j] + 1, prev + 1, dp[j - 1] + cost)
      dp[j - 1] = prev
      prev = val
    }
    dp[n] = prev
  }
  return dp[n]
}

function normaliserNom(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
}

function sontSimilaires(nom1: string, prenom1: string, nom2: string, prenom2: string): boolean {
  const n1 = normaliserNom(nom1), n2 = normaliserNom(nom2)
  const p1 = normaliserNom(prenom1), p2 = normaliserNom(prenom2)
  if (n1 === n2 && p1 === p2) return false // correspondance exacte, pas un doublon
  const distNom = levenshtein(n1, n2)
  const distPrenom = levenshtein(p1, p2)
  const totalDist = distNom + distPrenom
  const totalLen = Math.max(n1.length + p1.length, n2.length + p2.length)
  if (totalLen === 0) return false
  return totalDist <= 3 && (totalDist / totalLen) < 0.25
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LigneImport {
  ligne:        number
  date:         string
  nom:          string
  prenom:       string
  genre:        'HOMME' | 'FEMME' | null
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
  themesDetectes?:   { brut: string; occurrences: number }[]
  nomsInvalides?:    { cle: string; nom: string; prenom: string; lignes: number[]; nomInvalide: boolean; prenomInvalide: boolean }[]
  correspondancesSimilaires?: { excelNom: string; excelPrenom: string; baseNom: string; basePrenom: string; lignes: number[] }[]
  doublonsSuspectes?: { variantes: { cle: string; nom: string; prenom: string; lignes: number[] }[] }[]
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
  console.log('[Import visites] Colonnes détectées :', Object.fromEntries(cols))
  console.log('[Import visites] Headers du fichier :', headers)

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

    const nom    = strCol(row, cols.get('NOM')).toUpperCase() || 'ANONYME'
    const prenom = strCol(row, cols.get('PRENOM')) || ''
    const commentaire = strCol(row, cols.get('COMMENTAIRE'))
    let themeAtelier = strCol(row, cols.get('THEME_ATELIER'))
    const atelierCoche = boolVal(cols.has('ATELIERS') ? row[cols.get('ATELIERS')!] : '')
    const coursInfoCoche = boolVal(cols.has('COURS_INFO') ? row[cols.get('COURS_INFO')!] : '')

    // Si "ateliers" est coché sans colonne thème dédiée, extraire le thème du commentaire
    if (!themeAtelier && atelierCoche && commentaire) {
      // Prendre la partie avant le premier "+" (séparateur thème/démarche)
      const avant = commentaire.split('+')[0].trim()
      if (avant) themeAtelier = avant
    }

    // "Cours d'informatique" coché → créer aussi une ActionCollective
    if (coursInfoCoche && !themeAtelier) {
      themeAtelier = "Cours d'informatique"
    }

    const estAtelier = themeAtelier !== '' || atelierCoche || coursInfoCoche
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
      themeAtelierIds:         [],
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

  // Lire les corrections depuis le FormData (ou query string pour compatibilité)
  const mappingRaw = formData.get('mappingThemes') as string | null ?? url.searchParams.get('mappingThemes')
  const mappingThemes: Record<string, number | null> = mappingRaw
    ? JSON.parse(mappingRaw) as Record<string, number | null>
    : {}

  const genresRaw = formData.get('correctionsGenre') as string | null ?? url.searchParams.get('correctionsGenre')
  const correctionsGenre: Record<string, 'HOMME' | 'FEMME'> = genresRaw
    ? JSON.parse(genresRaw) as Record<string, 'HOMME' | 'FEMME'>
    : {}

  const nomsRaw = formData.get('correctionsNoms') as string | null ?? url.searchParams.get('correctionsNoms')
  const correctionsNoms: Record<string, { nom: string; prenom: string }> = nomsRaw
    ? JSON.parse(nomsRaw) as Record<string, { nom: string; prenom: string }>
    : {}

  const fichier = formData.get('fichier')
  if (!fichier || typeof fichier === 'string') {
    return NextResponse.json({ erreur: 'Fichier manquant' }, { status: 400 })
  }

  let buffer: ArrayBuffer
  let lignes: LigneImport[]
  let erreurs: { ligne: number; message: string }[]
  try {
    buffer = await (fichier as Blob).arrayBuffer()
    const parsed = parseExcel(buffer)
    lignes = parsed.lignes
    erreurs = parsed.erreurs
  } catch (e) {
    console.error('[Import visites] Erreur parsing Excel :', e)
    return NextResponse.json({ erreur: `Erreur lors de la lecture du fichier : ${e instanceof Error ? e.message : String(e)}` }, { status: 400 })
  }

  if (lignes.length === 0) {
    const resultat: ResultatImport = { total: 0, valides: 0, personnesMatchees: 0, personnesACreer: 0, doublons: 0, asidBrouillons: 0, erreurs }
    return NextResponse.json(resultat)
  }

  try {
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

    let matchees = 0; let aCreer = 0; let doublons = 0
    const personnesVues = new Set<string>()

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
    }

    // Collecter les thèmes d'ateliers détectés (fusionner par casse)
    // Clé = lowercase, valeur = { forme la plus fréquente, total occurrences }
    const themesMap = new Map<string, { formes: Map<string, number> }>()
    for (const l of lignes) {
      if (l.themeAtelier) {
        const cleLower = l.themeAtelier.toLowerCase().trim()
        if (!themesMap.has(cleLower)) {
          themesMap.set(cleLower, { formes: new Map() })
        }
        const entry = themesMap.get(cleLower)!
        entry.formes.set(l.themeAtelier, (entry.formes.get(l.themeAtelier) ?? 0) + 1)
      }
    }
    const themesDetectes = [...themesMap.entries()].map(([, { formes }]) => {
      // Choisir la forme la plus fréquente pour l'affichage
      let meilleureForme = ''
      let maxCount = 0
      let total = 0
      for (const [forme, count] of formes) {
        total += count
        if (count > maxCount) { maxCount = count; meilleureForme = forme }
      }
      return { brut: meilleureForme, occurrences: total }
    }).sort((a, b) => b.occurrences - a.occurrences)

    // Normaliser les thèmes des lignes vers la forme canonique pour le mapping
    const canonMap = new Map<string, string>() // lowercase → forme choisie
    for (const td of themesDetectes) {
      canonMap.set(td.brut.toLowerCase().trim(), td.brut)
    }
    for (const l of lignes) {
      if (l.themeAtelier) {
        l.themeAtelier = canonMap.get(l.themeAtelier.toLowerCase().trim()) ?? l.themeAtelier
      }
    }

    // Collecter les noms/prénoms invalides (regroupés par personne unique)
    const nomsInvalidesMap = new Map<string, { nom: string; prenom: string; lignes: number[]; nomInvalide: boolean; prenomInvalide: boolean }>()
    for (const l of lignes) {
      const ni = !nomValide(l.nom)
      const pi = l.prenom !== '' && !nomValide(l.prenom)
      if (!ni && !pi) continue
      const cle = `${l.nom}||${l.prenom}`
      const exist = nomsInvalidesMap.get(cle)
      if (exist) {
        exist.lignes.push(l.ligne)
      } else {
        nomsInvalidesMap.set(cle, { nom: l.nom, prenom: l.prenom, lignes: [l.ligne], nomInvalide: ni, prenomInvalide: pi })
      }
    }
    const nomsInvalides = [...nomsInvalidesMap.entries()]
      .map(([cle, v]) => ({ cle, ...v }))
      .sort((a, b) => b.lignes.length - a.lignes.length)

    // Collecter les personnes uniques du fichier Excel avec leurs lignes
    const personnesExcelMap = new Map<string, { nom: string; prenom: string; lignes: number[] }>()
    for (const l of lignes) {
      if (l.nom === 'ANONYME' || l.nom === '?') continue
      const cle = `${l.nom}||${l.prenom}`
      const exist = personnesExcelMap.get(cle)
      if (exist) { exist.lignes.push(l.ligne) } else { personnesExcelMap.set(cle, { nom: l.nom, prenom: l.prenom, lignes: [l.ligne] }) }
    }

    // Charger toutes les personnes actives de la base pour la comparaison floue
    const toutesPersonnesDB = await prisma.person.findMany({
      where: { deletedAt: null },
      select: { nom: true, prenom: true },
    })

    // Étape A — Excel ↔ Base : correspondances similaires (pas exactes)
    const correspondancesSimilaires: ResultatImport['correspondancesSimilaires'] = []
    const excelAvecCorrespondance = new Set<string>() // clés Excel qui ont trouvé un match en base

    for (const [cle, info] of personnesExcelMap) {
      // Si match exact en base, pas besoin de chercher un similaire
      if (setPers.has(`${info.nom}||${info.prenom.toLowerCase()}`)) continue

      // Chercher le meilleur match similaire en base
      let meilleurMatch: { nom: string; prenom: string; distance: number } | null = null
      for (const pdb of toutesPersonnesDB) {
        if (sontSimilaires(info.nom, info.prenom, pdb.nom, pdb.prenom)) {
          const dist = levenshtein(normaliserNom(info.nom), normaliserNom(pdb.nom))
                     + levenshtein(normaliserNom(info.prenom), normaliserNom(pdb.prenom))
          if (!meilleurMatch || dist < meilleurMatch.distance) {
            meilleurMatch = { nom: pdb.nom, prenom: pdb.prenom, distance: dist }
          }
        }
      }
      if (meilleurMatch) {
        correspondancesSimilaires.push({
          excelNom: info.nom, excelPrenom: info.prenom,
          baseNom: meilleurMatch.nom, basePrenom: meilleurMatch.prenom,
          lignes: info.lignes,
        })
        excelAvecCorrespondance.add(cle)
      }
    }

    // Étape B — Excel ↔ Excel : doublons entre variantes sans fiche en base
    const personnesSansMatch = [...personnesExcelMap.entries()]
      .filter(([cle, info]) =>
        !setPers.has(`${info.nom}||${info.prenom.toLowerCase()}`) && !excelAvecCorrespondance.has(cle)
      )

    // Union-Find pour regrouper les variantes similaires
    const ufParent = new Map<string, string>()
    function ufFind(x: string): string {
      if (!ufParent.has(x)) ufParent.set(x, x)
      if (ufParent.get(x) !== x) ufParent.set(x, ufFind(ufParent.get(x)!))
      return ufParent.get(x)!
    }
    function ufUnion(a: string, b: string) {
      const ra = ufFind(a), rb = ufFind(b)
      if (ra !== rb) ufParent.set(ra, rb)
    }

    for (let i = 0; i < personnesSansMatch.length; i++) {
      for (let j = i + 1; j < personnesSansMatch.length; j++) {
        const [cleA, infoA] = personnesSansMatch[i]
        const [cleB, infoB] = personnesSansMatch[j]
        if (sontSimilaires(infoA.nom, infoA.prenom, infoB.nom, infoB.prenom)) {
          ufUnion(cleA, cleB)
        }
      }
    }

    // Construire les groupes
    const groupesMap = new Map<string, string[]>()
    for (const [cle] of personnesSansMatch) {
      const root = ufFind(cle)
      if (!groupesMap.has(root)) groupesMap.set(root, [])
      groupesMap.get(root)!.push(cle)
    }

    const doublonsSuspectes: ResultatImport['doublonsSuspectes'] = []
    for (const membres of groupesMap.values()) {
      if (membres.length < 2) continue // pas un doublon si seul
      doublonsSuspectes.push({
        variantes: membres.map((cle) => {
          const info = personnesExcelMap.get(cle)!
          return { cle, nom: info.nom, prenom: info.prenom, lignes: info.lignes }
        }),
      })
    }

    const resultat: ResultatImport = {
      total:             lignes.length + erreurs.length,
      valides:           lignes.length,
      personnesMatchees: matchees,
      personnesACreer:   aCreer,
      doublons,
      asidBrouillons:    0,
      erreurs,
      apercu:            [
        ...lignes.filter((l) => !l.genre),
        ...lignes.filter((l) => l.genre).slice(0, 5),
      ],
      themesDetectes,
      nomsInvalides,
      correspondancesSimilaires: correspondancesSimilaires.length > 0
        ? correspondancesSimilaires.sort((a, b) => a.excelNom.localeCompare(b.excelNom) || a.excelPrenom.localeCompare(b.excelPrenom))
        : undefined,
      doublonsSuspectes: doublonsSuspectes.length > 0
        ? doublonsSuspectes.sort((a, b) => a.variantes[0].nom.localeCompare(b.variantes[0].nom))
        : undefined,
    }
    return NextResponse.json(resultat)
  }

  // ── Mode import réel ────────────────────────────────────────────────────────
  let importees = 0; let doublons = 0
  const erreursImport: { ligne: number; message: string }[] = [...erreurs]

  const cachePersonnes = new Map<string, number>()

  for (const l of lignes) {
    try {
      // 0. Appliquer les corrections de noms si fournies
      const cleNom = `${l.nom}||${l.prenom}`
      if (correctionsNoms[cleNom]) {
        l.nom = correctionsNoms[cleNom].nom
        l.prenom = correctionsNoms[cleNom].prenom
      }

      // 0b. Appliquer la correction de genre si fournie
      const genreFinal = correctionsGenre[String(l.ligne)] ?? l.genre
      if (!genreFinal) {
        erreursImport.push({ ligne: l.ligne, message: 'Genre non renseigné' })
        continue
      }

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
            data: { nom: l.nom, prenom: l.prenom, genre: genreFinal, estInscrit: false },
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
        // Utiliser le mapping fourni par le frontend, sinon chercher par nom
        const mappedId = mappingThemes[l.themeAtelier]
        let themeRefId: number | null = null

        if (mappedId !== undefined) {
          // Le mapping existe : soit un id valide, soit null (ignorer)
          themeRefId = mappedId
        } else {
          // Pas de mapping : chercher par nom exact
          const themeRef = await prisma.themeAtelierRef.findFirst({
            where: {
              nom: { equals: l.themeAtelier, mode: 'insensitive' },
              deletedAt: null,
            },
          })
          if (themeRef) themeRefId = themeRef.id
        }

        if (themeRefId) {
          const dateVisite = parseISO(l.date)
          // Chercher une séance existante ce jour-là pour ce thème
          const seanceExistante = await prisma.actionCollective.findFirst({
            where: { themeId: themeRefId, date: dateVisite, deletedAt: null },
          })
          if (seanceExistante) {
            actionCollectiveId = seanceExistante.id
          } else {
            const nouvelle = await prisma.actionCollective.create({
              data: { themeId: themeRefId, date: dateVisite },
            })
            actionCollectiveId = nouvelle.id
          }
        }
      }

      // 4. Créer Visit + Demarches (retirer les champs virtuels non-Prisma)
      const { actionCollectiveId: _ac, themeAtelierIds: _tai, ...demarachesSansAC } = l.demarches as typeof l.demarches & { actionCollectiveId?: unknown; themeAtelierIds?: unknown }
      void _ac; void _tai
      await prisma.visit.create({
        data: {
          date:        parseISO(l.date),
          personId,
          orienteParFT: l.orienteParFT,
          partenaires:  [],
          commentaire:  l.commentaire || null,
          saisieParId:  Number(session.user.id),
          demarches: {
            create: {
              ...demarachesSansAC,
              atelierParticipation: l.demarches.atelierParticipation || actionCollectiveId !== null,
            },
          },
          ateliers: actionCollectiveId ? { create: [{ actionCollectiveId }] } : undefined,
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
    } catch (err) {
      console.error(`[Import visites] Erreur ligne ${l.ligne} (${l.nom} ${l.prenom}) :`, err)
      erreursImport.push({ ligne: l.ligne, message: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
  }

  const resultat: ResultatImport = {
    total:             lignes.length + erreurs.length,
    valides:           importees + doublons,
    personnesMatchees: 0,
    personnesACreer:   0,
    doublons,
    asidBrouillons:    0,
    erreurs:           erreursImport,
  }
  return NextResponse.json(resultat)
  } catch (e) {
    console.error('[Import visites] Erreur inattendue :', e)
    return NextResponse.json(
      { erreur: `Erreur serveur : ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    )
  }
}
