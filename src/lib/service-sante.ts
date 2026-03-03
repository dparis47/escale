// ─── Types ────────────────────────────────────────────────────────────────────

/** Tous les champs booléens de ServiceSante (sans les champs de meta). */
export type ServiceSanteChamps = {
  dossierCSS:              boolean
  carteVitale:             boolean
  affiliationDroitsSante:  boolean
  affiliationMutuelle:     boolean
  invalidite:              boolean
  rattachementEnfants:     boolean
  ame:                     boolean
  creationCompteAmeli:     boolean
  consultationAmeli:       boolean
  echangeCpam:             boolean
  impressionDocuments:     boolean
  informationDroits:       boolean
  demarchesAccesSoins:     boolean
  dossierMDPH:             boolean
  suiviParcoursSoin:       boolean
  bilanSante:              boolean
  orientationCpam:         boolean
  orientationCramif:       boolean
  orientationSanteTravail: boolean
  orientationMDPH:         boolean
  orientationPASS:         boolean
  orientationAddictologie: boolean
  orientationMaisonFemmes: boolean
  orientationGemCmpa:      boolean
  orientationMedecins:     boolean
  orientationDepistage:    boolean
  santeMentale:            boolean
  soutienPsychologique:    boolean
}

export type NoeudFeuille = {
  type:  'feuille'
  champ: keyof ServiceSanteChamps
  label: string
}

export type NoeudSection = {
  type:    'section'
  id:      string
  label:   string
  enfants: Noeud[]
}

export type Noeud = NoeudFeuille | NoeudSection

// ─── Valeur vide ──────────────────────────────────────────────────────────────

export const SERVICE_SANTE_VIDE: ServiceSanteChamps = {
  dossierCSS:              false,
  carteVitale:             false,
  affiliationDroitsSante:  false,
  affiliationMutuelle:     false,
  invalidite:              false,
  rattachementEnfants:     false,
  ame:                     false,
  creationCompteAmeli:     false,
  consultationAmeli:       false,
  echangeCpam:             false,
  impressionDocuments:     false,
  informationDroits:       false,
  demarchesAccesSoins:     false,
  dossierMDPH:             false,
  suiviParcoursSoin:       false,
  bilanSante:              false,
  orientationCpam:         false,
  orientationCramif:       false,
  orientationSanteTravail: false,
  orientationMDPH:         false,
  orientationPASS:         false,
  orientationAddictologie: false,
  orientationMaisonFemmes: false,
  orientationGemCmpa:      false,
  orientationMedecins:     false,
  orientationDepistage:    false,
  santeMentale:            false,
  soutienPsychologique:    false,
}

// ─── Arbre ────────────────────────────────────────────────────────────────────

export const ARBRE_SANTE: Noeud[] = [
  {
    type: 'section',
    id:   'droits',
    label: 'Ouverture et maintien des droits',
    enfants: [
      { type: 'feuille', champ: 'dossierCSS',         label: 'Dossier CSS' },
      { type: 'feuille', champ: 'carteVitale',         label: 'Carte Vitale' },
      {
        type:  'section',
        id:    'affiliation',
        label: 'Affiliation',
        enfants: [
          { type: 'feuille', champ: 'affiliationDroitsSante', label: 'Droits sécurité sociale' },
          { type: 'feuille', champ: 'affiliationMutuelle',    label: 'Mutuelle' },
        ],
      },
      { type: 'feuille', champ: 'invalidite',          label: 'Invalidité' },
      { type: 'feuille', champ: 'rattachementEnfants', label: 'Rattachement enfants' },
      { type: 'feuille', champ: 'ame',                 label: 'AME' },
    ],
  },
  {
    type:  'section',
    id:    'numerique',
    label: 'Accès au numérique',
    enfants: [
      { type: 'feuille', champ: 'creationCompteAmeli', label: 'Création compte Ameli' },
      { type: 'feuille', champ: 'consultationAmeli',   label: 'Consultation Ameli' },
    ],
  },
  {
    type:  'section',
    id:    'demarches',
    label: 'Démarches administratives',
    enfants: [
      { type: 'feuille', champ: 'echangeCpam',         label: 'Échange CPAM' },
      { type: 'feuille', champ: 'impressionDocuments', label: 'Impression de documents' },
      { type: 'feuille', champ: 'informationDroits',   label: 'Information sur les droits' },
    ],
  },
  {
    type:  'section',
    id:    'soins',
    label: 'Accès aux soins et suivi du parcours santé',
    enfants: [
      { type: 'feuille', champ: 'demarchesAccesSoins', label: "Démarches d'accès aux soins" },
      { type: 'feuille', champ: 'dossierMDPH',         label: 'Dossier MDPH' },
      { type: 'feuille', champ: 'suiviParcoursSoin',   label: 'Suivi du parcours de soin' },
      { type: 'feuille', champ: 'bilanSante',          label: 'Bilan de santé' },
    ],
  },
  {
    type:  'section',
    id:    'orientations',
    label: 'Orientations partenaires',
    enfants: [
      {
        type:  'section',
        id:    'orientations-cpam',
        label: 'CPAM / MSA',
        enfants: [
          { type: 'feuille', champ: 'orientationCpam',         label: 'CPAM' },
          { type: 'feuille', champ: 'orientationCramif',       label: 'Cramif' },
          { type: 'feuille', champ: 'orientationSanteTravail', label: 'Santé au travail' },
        ],
      },
      { type: 'feuille', champ: 'orientationMDPH', label: 'MDPH' },
      { type: 'feuille', champ: 'orientationPASS', label: 'PASS' },
      {
        type:  'section',
        id:    'orientations-autres',
        label: 'Autres partenaires',
        enfants: [
          { type: 'feuille', champ: 'orientationAddictologie', label: 'Addictologie' },
          { type: 'feuille', champ: 'orientationMaisonFemmes', label: 'Maison des femmes' },
          { type: 'feuille', champ: 'orientationGemCmpa',      label: 'GEM / CMPA' },
          { type: 'feuille', champ: 'orientationMedecins',     label: 'Médecins' },
          { type: 'feuille', champ: 'orientationDepistage',    label: 'Dépistage' },
        ],
      },
    ],
  },
  { type: 'feuille', champ: 'santeMentale',         label: 'Santé mentale' },
  { type: 'feuille', champ: 'soutienPsychologique', label: 'Soutien psychologique' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Réinitialise à false tous les champs feuilles descendants d'une section. */
export function videChamps(
  champs: ServiceSanteChamps,
  noeud: NoeudSection,
): ServiceSanteChamps {
  const result = { ...champs }
  function reset(n: Noeud) {
    if (n.type === 'feuille') {
      result[n.champ] = false
    } else {
      n.enfants.forEach(reset)
    }
  }
  noeud.enfants.forEach(reset)
  return result
}

/** Renvoie les IDs de toutes les sous-sections d'un nœud section (récursif). */
export function collectSectionIds(noeud: NoeudSection): string[] {
  const ids: string[] = [noeud.id]
  for (const enfant of noeud.enfants) {
    if (enfant.type === 'section') ids.push(...collectSectionIds(enfant))
  }
  return ids
}

/**
 * Calcule l'ensemble des sections à ouvrir par défaut
 * (toute section contenant au moins un champ vrai).
 */
export function sectionsOuvertesInitiales(champs: ServiceSanteChamps): Set<string> {
  const ouvertes = new Set<string>()
  function check(n: Noeud): boolean {
    if (n.type === 'feuille') return champs[n.champ]
    const anyChild = n.enfants.some(check)
    if (anyChild) ouvertes.add(n.id)
    return anyChild
  }
  ARBRE_SANTE.forEach(check)
  return ouvertes
}

/** Renvoie les labels de tous les champs actifs (true) dans les champs ServiceSante. */
export function labelsActifs(champs: ServiceSanteChamps): string[] {
  const labels: string[] = []
  function collect(n: Noeud) {
    if (n.type === 'feuille') {
      if (champs[n.champ]) labels.push(n.label)
    } else {
      n.enfants.forEach(collect)
    }
  }
  ARBRE_SANTE.forEach(collect)
  return labels
}

