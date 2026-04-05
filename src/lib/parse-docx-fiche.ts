// ============================================================
// Parseur de fiches personnes Word (.docx)
// ============================================================

import AdmZip from 'adm-zip'
import type { Genre, SituationFamiliale, OrientePar, Ressource } from '@prisma/client'

// ─── Types publics ────────────────────────────────────────────────────────────

export interface FicheParsee {
  nomFichier:           string
  nom:                  string | null
  nomNaissance:         string | null
  prenom:               string | null
  genre:                Genre | null
  dateNaissance:        string | null  // YYYY-MM-DD
  adresse:              string | null
  telephone:            string | null
  email:                string | null
  css:                  boolean        // CMU / Complémentaire Santé
  rqth:                 boolean        // MDPH / COTOREP
  situationFamiliale:   SituationFamiliale | null
  nombreEnfantsCharge:  number | null
  permisConduire:       boolean
  vehiculePersonnel:    boolean
  hebergement:          string | null
  ressources:           Ressource[]
  orientePar:           OrientePar | null
  numeroFT:             string | null
  codepersonnelFT:      string | null
  numeroCAF:            string | null
  avertissements:       string[]
}

// ─── Structures internes ─────────────────────────────────────────────────────

/** Un segment de texte avec info de surlignage */
interface Segment {
  texte:    string
  surligne: boolean
}

/** Un paragraphe Word décomposé en segments ordonnés */
interface Paragraphe {
  segments: Segment[]
  texte:    string    // texte complet normalisé (pour le matching de labels)
}

// ─── Extraction XML ──────────────────────────────────────────────────────────

/** Nettoie les caractères de contrôle et espaces multiples */
function normaliser(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')            // supprimer tout tag XML résiduel
    .replace(/[\x00-\x1F\x7F\uFFFD\u00B7]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extraireParagraphes(xml: string): Paragraphe[] {
  const result: Paragraphe[] = []

  for (const paraMatch of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const paraXml  = paraMatch[0]
    const segments: Segment[] = []

    for (const runMatch of paraXml.matchAll(/<w:r[ >][\s\S]*?<\/w:r>/g)) {
      const runXml = runMatch[0]

      // Déterminer si le run est surligné en jaune
      const rPrMatch = runXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)
      const surligne = rPrMatch
        ? /w:highlight[\s\S]{0,60}yellow/.test(rPrMatch[1])
        : false

      // Extraire le texte des éléments <w:t>
      let runTexte = ''
      for (const tMatch of runXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)) {
        runTexte += tMatch[1]
      }
      // Tabulations → espace séparateur
      if (/<w:tab\s*\/>/.test(runXml)) runTexte += ' '

      if (runTexte) {
        segments.push({ texte: runTexte, surligne })
      }
    }

    // Construire texte = concaténation brute puis normalisation globale
    // (préserve les mots qui sont dans des runs consécutifs sans espace)
    const texte = normaliser(segments.map((s) => s.texte).join(''))
    if (texte) result.push({ segments, texte })
  }

  return result
}

// ─── Helpers d'extraction ────────────────────────────────────────────────────

/** Texte après un label ("Label : [valeur]") */
function valeurApres(texte: string, labelRe: RegExp): string {
  const m = texte.match(labelRe)
  if (!m) return ''
  return texte
    .slice(m.index! + m[0].length)
    .replace(/^[\s:·\u00B7]+/, '')
    .trim()
}

/** Supprime les placeholders (…, ...) */
function nettoyer(s: string): string {
  return /^[.\u2026\s]+$/.test(s) ? '' : s.trim()
}

/**
 * Dans un paragraphe avec plusieurs champs sur la même ligne,
 * trouve la valeur surlignée (oui/non) qui suit immédiatement un label.
 * Ex: "CMU : [oui] non  MDPH : oui [non]"
 */
function boolSurligneSuiteLabel(para: Paragraphe, labelRe: RegExp): boolean | null {
  if (!labelRe.test(para.texte)) return null

  // Trouver l'index du segment qui "complète" le label :
  // le premier segment après lequel le texte brut accumulé contient le label
  let rawAccum = ''
  let labelEndIdx = -1
  for (let i = 0; i < para.segments.length; i++) {
    rawAccum += para.segments[i].texte
    if (labelRe.test(normaliser(rawAccum))) {
      labelEndIdx = i
      break
    }
  }
  if (labelEndIdx < 0) return null

  // Chercher le premier segment surligné après le label
  for (let i = labelEndIdx + 1; i < para.segments.length; i++) {
    const seg = para.segments[i]
    if (seg.surligne) {
      const t = normaliser(seg.texte).trim()
      if (/oui/i.test(t)) return true
      if (/non/i.test(t)) return false
    }
  }
  return null
}

/** Date DD/MM/YYYY (ou YYYY-MM-DD) → YYYY-MM-DD */
function parseDate(s: string): string | null {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!m) return null
  const [, d, mo, y] = m
  const annee = y.length === 2 ? (parseInt(y) > 30 ? `19${y}` : `20${y}`) : y
  return `${annee}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// ─── Tables de correspondance ─────────────────────────────────────────────────

const SITUATION_MAP: [RegExp, SituationFamiliale][] = [
  [/mari[eé]/i,          'MARIE'],
  [/c[eé]libataire/i,    'CELIBATAIRE'],
  [/divorc[eé]/i,        'DIVORCE'],
  [/s[eé]par[eé]/i,      'SEPARE'],
  [/vie\s+maritale/i,    'CONCUBINAGE'],
  [/concubinage/i,       'CONCUBINAGE'],
  [/veuf/i,              'VEUF'],
  [/parent\s+isol[eé]/i, 'PARENT_ISOLE'],
]

function mapSituation(texte: string): SituationFamiliale | null {
  for (const [re, val] of SITUATION_MAP) {
    if (re.test(texte)) return val
  }
  return null
}

const RESSOURCE_MAP: [RegExp, Ressource][] = [
  [/\bare\b/i,             'ARE'],
  [/\bass\b/i,             'ASS'],
  [/\brsa\b/i,             'RSA'],
  [/\baah\b/i,             'AAH'],
  [/invalidit[eé]/i,       'INVALIDITE'],
  [/\bij\b/i,              'IJ'],
  [/\basi\b/i,             'ASI'],
  [/salaire/i,             'SALAIRE'],
  [/conjoint/i,            'CONJOINT'],
  [/sans\s+ressource/i,    'SANS_RESSOURCE'],
]

function mapRessources(texte: string): Ressource[] {
  return RESSOURCE_MAP
    .filter(([re]) => re.test(texte))
    .map(([, val]) => val)
}

const ORIENTE_MAP: [RegExp, OrientePar][] = [
  [/france\s+travail/i,      'FRANCE_TRAVAIL'],
  [/p[ôo]le\s+emploi/i,      'FRANCE_TRAVAIL'],
  [/\bcms\b/i,               'CMS'],
  [/\bmairie\b/i,            'MAIRIE'],
  [/connaissance/i,          'CONNAISSANCE'],
  [/bouche/i,                'CONNAISSANCE'],
  [/\bcmpa\b/i,              'CMPA'],
  [/maison\s+des\s+familles/i, 'MAISON_DES_FAMILLES'],
]

function mapOrientePar(texte: string): OrientePar | null {
  for (const [re, val] of ORIENTE_MAP) {
    if (re.test(texte)) return val
  }
  return null
}

// ─── Parseur principal ───────────────────────────────────────────────────────

const VIDE: FicheParsee = {
  nomFichier: '', nom: null, nomNaissance: null, prenom: null, genre: null, dateNaissance: null,
  adresse: null, telephone: null, email: null, css: false, rqth: false,
  situationFamiliale: null, nombreEnfantsCharge: null,
  permisConduire: false, vehiculePersonnel: false, hebergement: null,
  ressources: [], orientePar: null, numeroFT: null,
  codepersonnelFT: null, numeroCAF: null, avertissements: [],
}

export function parseDocxFiche(buffer: Buffer, nomFichier: string): FicheParsee {
  const avertissements: string[] = []

  let xml: string
  try {
    const zip   = new AdmZip(buffer)
    const entry = zip.getEntry('word/document.xml')
    if (!entry) throw new Error('document.xml introuvable')
    xml = entry.getData().toString('utf8')
  } catch (e) {
    return {
      ...VIDE,
      nomFichier,
      avertissements: [`Impossible de lire le fichier : ${e instanceof Error ? e.message : String(e)}`],
    }
  }

  const paras = extraireParagraphes(xml)

  let nom:                  string | null = null
  let nomNaissance:         string | null = null
  let prenom:               string | null = null
  let genre:                Genre  | null = null
  let dateNaissance:        string | null = null
  let adresse:              string | null = null
  let telephone:            string | null = null
  let email:                string | null = null
  let css                 = false
  let rqth                = false
  let situationFamiliale: SituationFamiliale | null = null
  let nombreEnfantsCharge: number | null = null
  let permisConduire      = false
  let vehiculePersonnel   = false
  let hebergement:          string | null = null
  let ressources:           Ressource[]  = []
  let orientePar:           OrientePar | null = null
  let numeroFT:             string | null = null
  let codepersonnelFT:      string | null = null
  let numeroCAF:            string | null = null
  let cpCount             = 0   // Le 1er "CP :" = pôle emploi, le 2ème = CAF

  for (const para of paras) {
    const t = para.texte

    // ── Nom de jeune fille seul (pas de champ "Nom" séparé) ──
    if (/^nom\s+de\s+jeune\s+fille\s*[:]\s*/i.test(t) && !nom) {
      const val = nettoyer(valeurApres(t, /^nom\s+de\s+jeune\s+fille\s*[:]\s*/i)).replace(/[.…]+/g, '').trim()
      if (val) {
        nom = val.toUpperCase()
        nomNaissance = val.toUpperCase()
        if (!genre) genre = 'FEMME'
      }
    }

    // ── Nom ─────────────────────────────────────────────────
    else if (/^nom\s*(?:\([^)]*\))?\s*[:]\s*/i.test(t) && !nom) {
      let val = valeurApres(t, /^nom\s*(?:\([^)]*\))?\s*[:]\s*/i)
      // Extraire "nom de jeune fille" si présent sur la même ligne
      const matchJeuneFille = val.match(/^(.+?)\s+nom\s+de\s+jeune\s+fille\s*[:\s]+(.+)/i)
      if (matchJeuneFille) {
        nomNaissance = nettoyer(matchJeuneFille[2]).replace(/[.…]+/g, '').trim().toUpperCase() || null
        val = matchJeuneFille[1]
      } else {
        val = val.replace(/nom\s+de\s+jeune\s+fille.*/i, '').trim()
      }
      val = nettoyer(val).replace(/[.…]+/g, '').trim()
      // Extraire nom de naissance entre parenthèses : "DUPONT (MARTIN)"
      const matchParentheses = val.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
      if (matchParentheses) {
        nomNaissance = matchParentheses[2].trim().toUpperCase()
        val = matchParentheses[1].trim()
      }
      if (val) nom = val.toUpperCase()
    }

    // ── Prénom + Sexe ────────────────────────────────────────
    else if (/^pr[eé]nom\s*(?:\([^)]*\))?\s*[:]/i.test(t)) {
      const mP = t.match(/pr[eé]nom\s*(?:\([^)]*\))?\s*[:\s]+(.+?)(?:\s{2,}|\s+sexe\s|$)/i)
      if (mP) prenom = nettoyer(mP[1]).replace(/[.…]+/g, '').trim() || null
      const mS = t.match(/sexe\s*[:\s]+([MF])\b/i)
      if (mS) genre = mS[1].toUpperCase() === 'M' ? 'HOMME' : 'FEMME'
    }

    // ── Date de naissance + Sexe FSE ─────────────────────────
    else if (/^date\s+de\s+naissance/i.test(t)) {
      dateNaissance = parseDate(valeurApres(t, /^date\s+de\s+naissance\s*[:]\s*/i))
      // Format FSE : "… Sexe : homme □ femme x" (x ou X = coché)
      if (!genre && /sexe\s*:/i.test(t)) {
        if (/femme\s*x/i.test(t)) genre = 'FEMME'
        else if (/homme\s*x/i.test(t)) genre = 'HOMME'
      }
    }

    // ── Adresse (y compris format FSE "Adresse à la date…") ──
    else if (/^adresse\s*(?:[àa]\s+la\s+date)?[^:]*[:]/i.test(t) && !adresse) {
      adresse = nettoyer(valeurApres(t, /^adresse\s*[^:]*[:]\s*/i)).replace(/[.…]+/g, '').trim() || null
    }

    // ── Téléphone (y compris "Numéro de téléphone (mobile)") ─
    else if (/(?:^t[eé]l[eé]phone|^num[eé]ro\s+de\s+t[eé]l[eé]phone\s*\(mobile\))\s*[:]/i.test(t) && !telephone) {
      const val = nettoyer(valeurApres(t, /(?:t[eé]l[eé]phone|num[eé]ro\s+de\s+t[eé]l[eé]phone\s*\(mobile\))\s*[:]\s*/i)).replace(/[.…]+/g, '').trim()
      telephone = val || null
    }

    // ── Email (y compris "Courriel") ─────────────────────────
    else if (/^(?:messagerie|e?mail|courriel)\s*[:]/i.test(t)) {
      const val = nettoyer(valeurApres(t, /^(?:messagerie|e?mail|courriel)\s*[:.]?\s*/i)).replace(/[.…]+$/, '').replace(/^[.…]+/, '').trim()
      email = val.includes('@') ? val : null
    }

    // ── Ligne multi-champs FSE fin de fiche ──────────────────
    // "Hébergement : locataire Ressources : RSA Orienté par : connaissances"
    else if (/h[eé]bergement\s*:/i.test(t) && /ressources\s*:/i.test(t)) {
      if (!hebergement) {
        const mH = t.match(/h[eé]bergement\s*:\s*(.+?)(?:\s+ressources\s*:|$)/i)
        if (mH) hebergement = nettoyer(mH[1]) || null
      }
      if (ressources.length === 0) {
        const mR = t.match(/ressources\s*:\s*(.+?)(?:\s+orient[eé]\s+par\s*:|$)/i)
        if (mR) ressources = mapRessources(mR[1])
      }
      if (!orientePar) {
        const mO = t.match(/orient[eé]\s+par\s*:\s*(.+)/i)
        if (mO) orientePar = mapOrientePar(nettoyer(mO[1]))
      }
    }

    // ── CMU (peut être sur la même ligne que MDPH) ───────────
    else if (/\bcmu\b/i.test(t)) {
      // Cherche la valeur surlignée qui suit "CMU"
      const b = boolSurligneSuiteLabel(para, /cmu\s*[:]\s*/i)
      if (b !== null) css = b

      // MDPH/COTOREP sur la même ligne
      if (/\bmdph\b|\bcotorep\b/i.test(t)) {
        const b2 = boolSurligneSuiteLabel(para, /(?:mdph|cotorep)\s*[:]\s*/i)
        if (b2 !== null) rqth = b2
      }
    }

    // ── MDPH / COTOREP seul ──────────────────────────────────
    else if (/^(?:mdph|cotorep|rqth)\s*[:]/i.test(t)) {
      const b = boolSurligneSuiteLabel(para, /(?:mdph|cotorep|rqth)\s*[:]\s*/i)
      if (b !== null) rqth = b
    }

    // ── Situation familiale + Enfants (même ligne, format FSE) ─
    else if (/situation\s+familiale\s*:/i.test(t) && /nombre\s+d[' \u2019\u2018]enfants/i.test(t)) {
      if (!situationFamiliale) {
        const mSF = t.match(/situation\s+familiale\s*:\s*(.+?)(?:\s+nombre\s+d)/i)
        if (mSF) situationFamiliale = mapSituation(mSF[1]) ?? situationFamiliale
      }
      if (nombreEnfantsCharge === null) {
        const mE = t.match(/nombre\s+d[' \u2019\u2018]enfants\s*[àa]?\s*charge\s*:\s*(\d+)/i)
        if (mE) nombreEnfantsCharge = parseInt(mE[1])
      }
    }

    // ── Situation familiale (choix sur une ligne) ─────────────
    else if (/mari[eé]|c[eé]libataire|divorc[eé]|s[eé]par[eé]|vie\s+maritale|veuf/i.test(t)) {
      // Format avec surlignage
      const surlignesPara = para.segments.filter((s) => s.surligne).map((s) => s.texte).join(' ')
      if (surlignesPara.trim()) {
        situationFamiliale = mapSituation(surlignesPara) ?? situationFamiliale
      }
      // Format texte brut "Situation familiale : Célibataire"
      if (!situationFamiliale && /situation\s+familiale\s*:/i.test(t)) {
        const mSF = t.match(/situation\s+familiale\s*:\s*(\S+)/i)
        if (mSF) situationFamiliale = mapSituation(mSF[1]) ?? situationFamiliale
      }
    }

    // ── Nombre d'enfants ─────────────────────────────────────
    else if (/nombre\s+d[' \u2019\u2018]enfants/i.test(t)) {
      const m = t.match(/[:\s]\s*(\d+)/)
      if (m) nombreEnfantsCharge = parseInt(m[1])
    }

    // ── Permis de conduire ───────────────────────────────────
    else if (/^permis\s+de\s+conduire/i.test(t)) {
      const b = boolSurligneSuiteLabel(para, /permis\s+de\s+conduire\s*/i)
      if (b !== null) permisConduire = b
    }

    // ── Véhicule personnel ───────────────────────────────────
    else if (/^v[eé]hicule\s+personnel/i.test(t)) {
      const b = boolSurligneSuiteLabel(para, /v[eé]hicule\s+personnel\s*/i)
      if (b !== null) vehiculePersonnel = b
    }

    // ── Hébergement ──────────────────────────────────────────
    else if (/^h[eé]bergement\s*[:]/i.test(t)) {
      hebergement = nettoyer(valeurApres(t, /^h[eé]bergement\s*[:]\s*/i)) || null
    }

    // ── Ressources ───────────────────────────────────────────
    else if (/^ressources\s*[:]/i.test(t)) {
      ressources = mapRessources(valeurApres(t, /^ressources\s*[:]\s*/i))
    }

    // ── Orienté par ──────────────────────────────────────────
    else if (/^orient[eé]\s+par\s*[:]/i.test(t)) {
      orientePar = mapOrientePar(nettoyer(valeurApres(t, /^orient[eé]\s+par\s*[:]\s*/i)))
    }

    // ── N° pôle emploi ───────────────────────────────────────
    else if (/n[o°]\s*(?:p[ôo]le\s+emploi|france\s+travail)/i.test(t)) {
      const val = nettoyer(valeurApres(t, /n[o°]\s*(?:p[ôo]le\s+emploi|france\s+travail)\s*[:]\s*/i))
      if (val && !/^[.\u2026]+$/.test(val)) numeroFT = val
    }

    // ── CP (1er = pôle emploi, 2e = CAF) ─────────────────────
    else if (/^cp\s*[:]/i.test(t)) {
      cpCount++
      const val = nettoyer(valeurApres(t, /^cp\s*[:]\s*/i))
      if (val && !/^[.\u2026]+$/.test(val)) {
        if (cpCount === 1) codepersonnelFT = val
      }
    }

    // ── N° CAF ───────────────────────────────────────────────
    else if (/n[o°]\s*caf/i.test(t)) {
      const val = nettoyer(valeurApres(t, /n[o°]\s*caf\s*[:]\s*/i))
      if (val && !/^[.\u2026]+$/.test(val)) numeroCAF = val
    }
  }

  if (!nom)    avertissements.push('Nom non trouvé')
  if (!prenom) avertissements.push('Prénom non trouvé')
  if (!genre)  avertissements.push('Genre non trouvé')

  return {
    nomFichier, nom, nomNaissance, prenom, genre, dateNaissance,
    adresse, telephone, email, css, rqth,
    situationFamiliale, nombreEnfantsCharge,
    permisConduire, vehiculePersonnel, hebergement,
    ressources, orientePar, numeroFT, codepersonnelFT, numeroCAF,
    avertissements,
  }
}
