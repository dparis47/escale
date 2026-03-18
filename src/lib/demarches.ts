// ============================================================
// Arbre unifié des démarches — partagé entre Visit et ASID
// ============================================================

// ─── Type des champs ──────────────────────────────────────────────────────────

export type DemarcheChamps = {
  // ACCES AUX DROITS
  droitsCafMsa:              boolean

  // EMPLOI
  emploiRechercheEmploi:     boolean
  emploiConsultationOffres:  boolean
  emploiCandidatures:        boolean
  emploiOffresProposees:     boolean
  emploiOffresNombre:        number | null
  emploiProjetProfessionnel: boolean
  emploiProjetFormation:     boolean
  emploiCvLm:                boolean
  emploiEntretiens:          boolean
  emploiPreparationEntretien: boolean
  emploiSimulationEntretien:  boolean
  emploiEchangeFT:           boolean
  emploiInscriptionFT:       boolean
  emploiInscriptionJob47:    boolean
  emploiInscriptionInterim:  boolean
  emploiEspaceFT:            boolean
  emploiPmsmp:               boolean

  // SANTE
  santeRendezVousPASS:       boolean
  santeCss:                  boolean
  santeCssDossier:           boolean
  santeCssOuverture:         boolean
  santeCarteVitale:          boolean
  santeAffiliation:          boolean
  santeAffiliationSecu:      boolean
  santeAffiliationMutuelle:  boolean
  santeInvalidite:           boolean
  santeRattachementEnfants:  boolean
  santeAme:                  boolean
  santeNumeriqueAmeli:       boolean
  santeNumeriqueConsultAmeli: boolean
  santeDemarchesEchangeCPAM: boolean
  santeDemarchesImpression:  boolean
  santeDemarchesInfo:        boolean
  santeAccesSoins:           boolean
  santeMdph:                 boolean
  santeSuiviSante:           boolean
  santeBilanSante:           boolean
  santeOrientCpam:           boolean
  santeOrientCramif:         boolean
  santeOrientSanteTravail:   boolean
  santeOrientMdph:           boolean
  santeOrientPass:           boolean
  santeOrientAddictologie:   boolean
  santeOrientMaisonFemmes:   boolean
  santeOrientGemCmpa:        boolean
  santeOrientMedecins:       boolean
  santeOrientDepistage:      boolean
  santeMentale:              boolean
  santeSoutienPsy:           boolean

  // MOBILITE
  mobilitCarteSolidaire:     boolean
  mobilitAutoEcole:          boolean
  mobilitAutoEcoleCode:      boolean
  mobilitAutoEcoleConduite:  boolean
  mobilitBdi:                boolean
  mobilitBdiPermis:          boolean
  mobilitBdiReparation:      boolean
  mobilitApreva:             boolean
  mobilitItineraire:         boolean
  mobilitMicroCredit:        boolean
  mobilitCovoiturage:        boolean

  // LOGEMENT
  logementHabitatIndigne:    boolean
  logementDemenagement:      boolean
  logementAcces:             boolean
  logementOrientation:       boolean
  logementRecherche:         boolean

  // INCLUSION NUMERIQUE
  numeriqueEspaceNumerique:  boolean
  numeriqueAccompagnement:   boolean
  numeriqueCoursInfo:        boolean

  // AUTRES
  autresInfoConseil:         boolean
  autresInput:               string | null

  // LUTTE CONTRE L'ISOLEMENT
  isolementLienSocial:       boolean

  // PARENTALITE
  parentaliteSoutien:        boolean
  parentaliteModeGarde:      boolean
  parentalitePmi:            boolean
  parentaliteMaisonFamilles: boolean
  parentaliteMaison1000:     boolean
  parentaliteCafeCulturel:   boolean
  parentaliteMissionLocale:  boolean
  parentaliteAutreInput:     string | null

  // ATELIERS DE REDYNAMISATION
  atelierParticipation:      boolean
  actionCollectiveId:        number | null
  themeAtelierId:            number | null
}

// ─── Types des nœuds ─────────────────────────────────────────────────────────

type ChampsBool = {
  [K in keyof DemarcheChamps]: DemarcheChamps[K] extends boolean ? K : never
}[keyof DemarcheChamps]

type ChampsTexte = {
  [K in keyof DemarcheChamps]: DemarcheChamps[K] extends string | null ? K : never
}[keyof DemarcheChamps]

type ChampsNombre = {
  [K in keyof DemarcheChamps]: DemarcheChamps[K] extends number | null ? K : never
}[keyof DemarcheChamps]

/** Case à cocher. Peut avoir un champ nombre ou texte lié (affiché quand la case est cochée). */
export type NoeudFeuille = {
  type:          'feuille'
  champ:         ChampsBool
  label:         string
  champNombre?:  ChampsNombre
  champTexte?:   ChampsTexte
}

/** Input texte autonome (sans case à cocher parente). */
export type NoeudTexte = {
  type:        'texte'
  champ:       ChampsTexte
  label:       string
}

/** Section repliable (pas de case à cocher propre). */
export type NoeudSection = {
  type:    'section'
  id:      string
  label:   string
  enfants: Noeud[]
}

/** Thème de niveau 0 (toujours visible). */
export type NoeudTheme = {
  type:    'theme'
  id:      string
  label:   string
  enfants: Noeud[]
}

export type Noeud = NoeudFeuille | NoeudTexte | NoeudSection

// ─── Valeur vide ──────────────────────────────────────────────────────────────

export const DEMARCHE_VIDE: DemarcheChamps = {
  droitsCafMsa:               false,
  emploiRechercheEmploi:      false,
  emploiConsultationOffres:   false,
  emploiCandidatures:         false,
  emploiOffresProposees:      false,
  emploiOffresNombre:         null,
  emploiProjetProfessionnel:  false,
  emploiProjetFormation:      false,
  emploiCvLm:                 false,
  emploiEntretiens:           false,
  emploiPreparationEntretien: false,
  emploiSimulationEntretien:  false,
  emploiEchangeFT:            false,
  emploiInscriptionFT:        false,
  emploiInscriptionJob47:     false,
  emploiInscriptionInterim:   false,
  emploiEspaceFT:             false,
  emploiPmsmp:                false,
  santeRendezVousPASS:        false,
  santeCss:                   false,
  santeCssDossier:            false,
  santeCssOuverture:          false,
  santeCarteVitale:           false,
  santeAffiliation:           false,
  santeAffiliationSecu:       false,
  santeAffiliationMutuelle:   false,
  santeInvalidite:            false,
  santeRattachementEnfants:   false,
  santeAme:                   false,
  santeNumeriqueAmeli:        false,
  santeNumeriqueConsultAmeli: false,
  santeDemarchesEchangeCPAM:  false,
  santeDemarchesImpression:   false,
  santeDemarchesInfo:         false,
  santeAccesSoins:            false,
  santeMdph:                  false,
  santeSuiviSante:            false,
  santeBilanSante:            false,
  santeOrientCpam:            false,
  santeOrientCramif:          false,
  santeOrientSanteTravail:    false,
  santeOrientMdph:            false,
  santeOrientPass:            false,
  santeOrientAddictologie:    false,
  santeOrientMaisonFemmes:    false,
  santeOrientGemCmpa:         false,
  santeOrientMedecins:        false,
  santeOrientDepistage:       false,
  santeMentale:               false,
  santeSoutienPsy:            false,
  mobilitCarteSolidaire:      false,
  mobilitAutoEcole:           false,
  mobilitAutoEcoleCode:       false,
  mobilitAutoEcoleConduite:   false,
  mobilitBdi:                 false,
  mobilitBdiPermis:           false,
  mobilitBdiReparation:       false,
  mobilitApreva:              false,
  mobilitItineraire:          false,
  mobilitMicroCredit:         false,
  mobilitCovoiturage:         false,
  logementHabitatIndigne:     false,
  logementDemenagement:       false,
  logementAcces:              false,
  logementOrientation:        false,
  logementRecherche:          false,
  numeriqueEspaceNumerique:   false,
  numeriqueAccompagnement:    false,
  numeriqueCoursInfo:         false,
  autresInfoConseil:          false,
  autresInput:                null,
  isolementLienSocial:        false,
  parentaliteSoutien:         false,
  parentaliteModeGarde:       false,
  parentalitePmi:             false,
  parentaliteMaisonFamilles:  false,
  parentaliteMaison1000:      false,
  parentaliteCafeCulturel:    false,
  parentaliteMissionLocale:   false,
  parentaliteAutreInput:      null,
  atelierParticipation:       false,
  actionCollectiveId:         null,
  themeAtelierId:             null,
}

// ─── Arbre ────────────────────────────────────────────────────────────────────

export const ARBRE_DEMARCHES: NoeudTheme[] = [
  {
    type: 'theme', id: 'acces-droits', label: 'ACCES AUX DROITS',
    enfants: [
      { type: 'feuille', champ: 'droitsCafMsa', label: 'CAF / MSA' },
    ],
  },
  {
    type: 'theme', id: 'emploi', label: 'EMPLOI',
    enfants: [
      {
        type: 'feuille', champ: 'emploiRechercheEmploi', label: "Recherche d'emploi",
        // enfants (niveau 2) gérés par la section ci-dessous
      },
      {
        type: 'section', id: 'emploi-recherche-detail', label: '',
        enfants: [
          { type: 'feuille', champ: 'emploiConsultationOffres', label: 'Consultation des offres' },
          { type: 'feuille', champ: 'emploiCandidatures',       label: 'Candidatures' },
        ],
      },
      {
        type: 'feuille', champ: 'emploiOffresProposees', label: "Offres d'emploi proposées",
        champNombre: 'emploiOffresNombre',
      },
      { type: 'feuille', champ: 'emploiProjetProfessionnel', label: 'Élaboration du projet professionnel' },
      { type: 'feuille', champ: 'emploiProjetFormation',     label: 'Élaboration du projet de formation' },
      { type: 'feuille', champ: 'emploiCvLm',                label: 'CV / LM' },
      {
        type: 'feuille', champ: 'emploiEntretiens', label: 'Entretiens',
      },
      {
        type: 'section', id: 'emploi-entretiens-detail', label: '',
        enfants: [
          { type: 'feuille', champ: 'emploiPreparationEntretien', label: "Préparation entretien d'embauche" },
          { type: 'feuille', champ: 'emploiSimulationEntretien',  label: "Simulation d'entretien d'embauche" },
        ],
      },
      { type: 'feuille', champ: 'emploiEchangeFT',         label: 'Échange administratif avec France Travail' },
      { type: 'feuille', champ: 'emploiInscriptionFT',     label: 'Inscription à France Travail' },
      { type: 'feuille', champ: 'emploiInscriptionJob47',  label: 'Inscription à Job 47' },
      { type: 'feuille', champ: 'emploiInscriptionInterim', label: "Inscription agence d'intérim" },
      { type: 'feuille', champ: 'emploiEspaceFT',          label: "Accès à l'espace personnel France Travail" },
      { type: 'feuille', champ: 'emploiPmsmp',             label: 'PMSMP' },
    ],
  },
  {
    type: 'theme', id: 'sante', label: 'SANTE',
    enfants: [
      { type: 'feuille', champ: 'santeRendezVousPASS', label: 'Rencontre PASS' },
      { type: 'feuille', champ: 'santeCss',            label: 'CSS' },
      {
        type: 'section', id: 'sante-css-detail', label: '',
        enfants: [
          { type: 'feuille', champ: 'santeCssDossier',  label: 'Démarche de constitution du dossier' },
          { type: 'feuille', champ: 'santeCssOuverture', label: 'Ouverture du droit CSS' },
        ],
      },
      {
        type: 'section', id: 'sante-droits', label: 'Ouverture et maintien des droits',
        enfants: [
          { type: 'feuille', champ: 'santeCarteVitale',        label: 'Carte Vitale' },
          { type: 'feuille', champ: 'santeAffiliation',        label: 'Affiliation' },
          {
            type: 'section', id: 'sante-affiliation-detail', label: '',
            enfants: [
              { type: 'feuille', champ: 'santeAffiliationSecu',     label: 'Droits Sécurité Sociale' },
              { type: 'feuille', champ: 'santeAffiliationMutuelle', label: 'Mutuelle' },
            ],
          },
          { type: 'feuille', champ: 'santeInvalidite',          label: 'Invalidité' },
          { type: 'feuille', champ: 'santeRattachementEnfants', label: 'Rattachement enfants' },
          { type: 'feuille', champ: 'santeAme',                 label: 'AME' },
        ],
      },
      {
        type: 'section', id: 'sante-numerique', label: 'Accès au numérique',
        enfants: [
          { type: 'feuille', champ: 'santeNumeriqueAmeli',       label: 'Création de compte Ameli' },
          { type: 'feuille', champ: 'santeNumeriqueConsultAmeli', label: 'Consultation Ameli' },
        ],
      },
      {
        type: 'section', id: 'sante-demarches', label: 'Démarches administratives',
        enfants: [
          { type: 'feuille', champ: 'santeDemarchesEchangeCPAM', label: 'Échange CPAM' },
          { type: 'feuille', champ: 'santeDemarchesImpression',  label: 'Impression de documents' },
          { type: 'feuille', champ: 'santeDemarchesInfo',        label: 'Information sur les droits' },
        ],
      },
      {
        type: 'section', id: 'sante-soins', label: 'Accès aux soins et suivi du parcours santé',
        enfants: [
          { type: 'feuille', champ: 'santeAccesSoins',  label: "Démarches d'accès aux soins" },
          { type: 'feuille', champ: 'santeMdph',        label: 'Dossier MDPH' },
          { type: 'feuille', champ: 'santeSuiviSante',  label: 'Suivi du parcours de santé' },
          { type: 'feuille', champ: 'santeBilanSante',  label: 'Bilan de santé' },
        ],
      },
      {
        type: 'section', id: 'sante-orient', label: 'Orientation partenaires',
        enfants: [
          {
            type: 'section', id: 'sante-orient-cpam', label: 'CPAM / MSA',
            enfants: [
              { type: 'feuille', champ: 'santeOrientCpam',         label: 'CPAM' },
              { type: 'feuille', champ: 'santeOrientCramif',       label: 'CRAMIF' },
              { type: 'feuille', champ: 'santeOrientSanteTravail', label: 'Santé au travail' },
            ],
          },
          { type: 'feuille', champ: 'santeOrientMdph', label: 'MDPH' },
          { type: 'feuille', champ: 'santeOrientPass', label: 'PASS' },
          {
            type: 'section', id: 'sante-orient-autres', label: 'Autres partenaires',
            enfants: [
              { type: 'feuille', champ: 'santeOrientAddictologie', label: 'Addictologie' },
              { type: 'feuille', champ: 'santeOrientMaisonFemmes', label: 'Maison des Femmes' },
              { type: 'feuille', champ: 'santeOrientGemCmpa',      label: 'GEM / CMPA' },
              { type: 'feuille', champ: 'santeOrientMedecins',     label: 'Médecins' },
              { type: 'feuille', champ: 'santeOrientDepistage',    label: 'Dépistage' },
            ],
          },
        ],
      },
      { type: 'feuille', champ: 'santeMentale',   label: 'Santé mentale' },
      { type: 'feuille', champ: 'santeSoutienPsy', label: 'Soutien psychologique' },
    ],
  },
  {
    type: 'theme', id: 'mobilite', label: 'MOBILITE',
    enfants: [
      { type: 'feuille', champ: 'mobilitCarteSolidaire', label: 'Carte solidaire' },
      { type: 'feuille', champ: 'mobilitAutoEcole',      label: "Inscription auto-école" },
      {
        type: 'section', id: 'mobilit-autoecole-detail', label: '',
        enfants: [
          { type: 'feuille', champ: 'mobilitAutoEcoleCode',     label: 'Code' },
          { type: 'feuille', champ: 'mobilitAutoEcoleConduite', label: 'Conduite' },
        ],
      },
      { type: 'feuille', champ: 'mobilitBdi', label: 'Demande de BDI' },
      {
        type: 'section', id: 'mobilit-bdi-detail', label: '',
        enfants: [
          { type: 'feuille', champ: 'mobilitBdiPermis',    label: 'Permis de conduire' },
          { type: 'feuille', champ: 'mobilitBdiReparation', label: 'Réparation de véhicule' },
        ],
      },
      { type: 'feuille', champ: 'mobilitApreva',     label: 'Location Apreva' },
      { type: 'feuille', champ: 'mobilitItineraire', label: "Aide au calcul d'itinéraire" },
      { type: 'feuille', champ: 'mobilitMicroCredit', label: "Micro crédit pour l'achat d'un véhicule" },
      { type: 'feuille', champ: 'mobilitCovoiturage', label: 'Co-voiturage' },
    ],
  },
  {
    type: 'theme', id: 'logement', label: 'LOGEMENT',
    enfants: [
      { type: 'feuille', champ: 'logementHabitatIndigne', label: 'Habitat indigne' },
      { type: 'feuille', champ: 'logementDemenagement',   label: 'Déménagement' },
      { type: 'feuille', champ: 'logementAcces',          label: 'Accès au logement (parc public / privé)' },
      { type: 'feuille', champ: 'logementOrientation',    label: 'Orientation partenaires (ADIL, Hurbanis, Bailleurs sociaux…)' },
      { type: 'feuille', champ: 'logementRecherche',      label: 'Recherche de logement' },
    ],
  },
  {
    type: 'theme', id: 'numerique', label: 'INCLUSION NUMERIQUE',
    enfants: [
      { type: 'feuille', champ: 'numeriqueEspaceNumerique', label: "Accès à l'espace numérique" },
      { type: 'feuille', champ: 'numeriqueAccompagnement',  label: 'Accompagnement au numérique' },
      { type: 'feuille', champ: 'numeriqueCoursInfo',       label: "Cours d'informatique" },
    ],
  },
  {
    type: 'theme', id: 'autres', label: 'AUTRES',
    enfants: [
      { type: 'feuille', champ: 'autresInfoConseil', label: 'Info / Conseil' },
      { type: 'texte',   champ: 'autresInput',       label: 'Autres' },
    ],
  },
  {
    type: 'theme', id: 'isolement', label: "LUTTE CONTRE L'ISOLEMENT",
    enfants: [
      { type: 'feuille', champ: 'isolementLienSocial', label: 'Lien social' },
    ],
  },
  {
    type: 'theme', id: 'parentalite', label: 'PARENTALITE',
    enfants: [
      { type: 'feuille', champ: 'parentaliteSoutien',   label: 'Soutien à la parentalité' },
      { type: 'feuille', champ: 'parentaliteModeGarde', label: "Recherche d'un mode de garde" },
      {
        type: 'section', id: 'parentalite-orient', label: 'Orientation partenaire',
        enfants: [
          { type: 'feuille', champ: 'parentalitePmi',            label: 'PMI' },
          { type: 'feuille', champ: 'parentaliteMaisonFamilles', label: 'Maison des Familles' },
          { type: 'feuille', champ: 'parentaliteMaison1000',     label: 'Maison 1000 bulles' },
          { type: 'feuille', champ: 'parentaliteCafeCulturel',   label: 'Café culturel 109' },
          { type: 'feuille', champ: 'parentaliteMissionLocale',  label: 'Mission Locale' },
          { type: 'texte',   champ: 'parentaliteAutreInput',     label: 'Autre' },
        ],
      },
    ],
  },
  {
    type: 'theme', id: 'ateliers', label: 'ATELIERS DE REDYNAMISATION',
    enfants: [
      { type: 'feuille', champ: 'atelierParticipation', label: "Participation à un atelier" },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Réinitialise à false/null tous les champs descendants d'une section. */
export function videChampsDemarche(
  champs: DemarcheChamps,
  noeud: NoeudSection,
): DemarcheChamps {
  const result = { ...champs }
  function reset(n: Noeud) {
    if (n.type === 'feuille') {
      (result[n.champ] as boolean) = false
      if (n.champNombre)  (result[n.champNombre]  as null)     = null
      if (n.champTexte)   (result[n.champTexte]   as null)     = null
    } else if (n.type === 'texte') {
      (result[n.champ] as null) = null
    } else {
      n.enfants.forEach(reset)
    }
  }
  noeud.enfants.forEach(reset)
  return result
}

/** Réinitialise à false/null tous les champs descendants d'un thème. */
export function videChampsDemarcheTheme(
  champs: DemarcheChamps,
  theme: NoeudTheme,
): DemarcheChamps {
  const sectionFictive: NoeudSection = { type: 'section', id: '', label: '', enfants: theme.enfants }
  return videChampsDemarche(champs, sectionFictive)
}

/** Renvoie les IDs de toutes les sous-sections d'un nœud section (récursif). */
export function collectSectionIds(noeud: NoeudSection): string[] {
  const ids: string[] = [noeud.id]
  for (const enfant of noeud.enfants) {
    if (enfant.type === 'section') ids.push(...collectSectionIds(enfant))
  }
  return ids
}

/** Vérifie si un nœud (et ses descendants) contient au moins un champ actif. */
function noeudActif(n: Noeud, champs: DemarcheChamps): boolean {
  if (n.type === 'feuille') return champs[n.champ] === true
  if (n.type === 'texte')   return !!champs[n.champ]
  return n.enfants.some((e) => noeudActif(e, champs))
}

/** Calcule l'ensemble des sections ouvertes par défaut (celles contenant au moins un champ actif). */
export function sectionsOuvertesInitiales(champs: DemarcheChamps): Set<string> {
  const ouvertes = new Set<string>()
  function check(n: Noeud): boolean {
    if (n.type === 'feuille') return champs[n.champ] === true
    if (n.type === 'texte')   return !!champs[n.champ]
    const anyChild = n.enfants.some(check)
    if (anyChild) ouvertes.add(n.id)
    return anyChild
  }
  for (const theme of ARBRE_DEMARCHES) {
    theme.enfants.forEach(check)
  }
  return ouvertes
}

/** Renvoie les IDs des thèmes contenant au moins un champ actif. */
export function themesActifs(champs: DemarcheChamps): Set<string> {
  const actifs = new Set<string>()
  for (const theme of ARBRE_DEMARCHES) {
    if (theme.enfants.some((n) => noeudActif(n, champs))) {
      actifs.add(theme.id)
    }
  }
  return actifs
}

/** Renvoie les thèmes actifs avec leurs feuilles actives (pour affichage groupé). */
export function themesAvecFeuilles(
  champs: DemarcheChamps,
): { id: string; label: string; feuilles: string[] }[] {
  function walkFeuilles(n: Noeud, labels: string[]) {
    if (n.type === 'feuille') {
      if (champs[n.champ] === true) {
        labels.push(n.label)
      }
    } else if (n.type === 'section') {
      n.enfants.forEach((e) => walkFeuilles(e, labels))
    }
  }
  const result: { id: string; label: string; feuilles: string[] }[] = []
  for (const theme of ARBRE_DEMARCHES) {
    const feuilles: string[] = []
    theme.enfants.forEach((n) => walkFeuilles(n, feuilles))
    if (feuilles.length > 0) result.push({ id: theme.id, label: theme.label, feuilles })
  }
  return result
}

/** Renvoie tous les noms de champs booléens (feuilles) sous un thème donné. */
export function champsTheme(themeId: string): string[] {
  const theme = ARBRE_DEMARCHES.find((t) => t.id === themeId)
  if (!theme) return []
  const champs: string[] = []
  function walk(n: Noeud) {
    if (n.type === 'feuille') champs.push(n.champ)
    else if (n.type === 'section') n.enfants.forEach(walk)
  }
  theme.enfants.forEach(walk)
  return champs
}

/** Renvoie les paires { champ, label } pour toutes les feuilles d'un thème. */
export function feuillesTheme(themeId: string): { champ: string; label: string }[] {
  const theme = ARBRE_DEMARCHES.find((t) => t.id === themeId)
  if (!theme) return []
  const feuilles: { champ: string; label: string }[] = []
  function walk(n: Noeud) {
    if (n.type === 'feuille') feuilles.push({ champ: n.champ, label: n.label })
    else if (n.type === 'section') n.enfants.forEach(walk)
  }
  theme.enfants.forEach(walk)
  return feuilles
}

/** Vérifie si un objet démarches correspond au filtre thème et/ou champ précis. */
export function matchFiltresDemarches(
  demarches: Record<string, unknown> | null,
  themeId: string | null,
  champ: string | null,
): boolean {
  if (!themeId && !champ) return true
  if (!demarches) return false
  if (champ) return demarches[champ] === true
  if (themeId) {
    const champs = champsTheme(themeId)
    return champs.some((c) => demarches[c] === true)
  }
  return true
}

/** Colonnes d'export/import : une entrée par feuille/texte de l'arbre, préfixée par le thème. */
export type ColonneExportDemarche = {
  header: string
  champ:  string
  type:   'bool' | 'nombre' | 'texte'
}

export function colonnesDemarchesExport(): ColonneExportDemarche[] {
  const colonnes: ColonneExportDemarche[] = []

  for (const theme of ARBRE_DEMARCHES) {
    function walk(n: Noeud) {
      if (n.type === 'feuille') {
        colonnes.push({ header: `${theme.label} — ${n.label}`, champ: n.champ, type: 'bool' })
        if (n.champNombre) {
          colonnes.push({ header: `${theme.label} — ${n.label} (nb)`, champ: n.champNombre, type: 'nombre' })
        }
        if (n.champTexte) {
          colonnes.push({ header: `${theme.label} — ${n.label} (texte)`, champ: n.champTexte, type: 'texte' })
        }
      } else if (n.type === 'texte') {
        colonnes.push({ header: `${theme.label} — ${n.label}`, champ: n.champ, type: 'texte' })
      } else {
        n.enfants.forEach(walk)
      }
    }
    theme.enfants.forEach(walk)
  }

  return colonnes
}

/** Extrait les champs DemarcheChamps depuis un objet Prisma DemarcheVisite ou DemarcheASID. */
export function fromPrisma(obj: Record<string, unknown>): DemarcheChamps {
  const bool = (k: string): boolean => obj[k] === true
  const str  = (k: string): string | null => (typeof obj[k] === 'string' ? (obj[k] as string) : null)
  const num  = (k: string): number | null => (typeof obj[k] === 'number' ? (obj[k] as number) : null)
  return {
    droitsCafMsa:               bool('droitsCafMsa'),
    emploiRechercheEmploi:      bool('emploiRechercheEmploi'),
    emploiConsultationOffres:   bool('emploiConsultationOffres'),
    emploiCandidatures:         bool('emploiCandidatures'),
    emploiOffresProposees:      bool('emploiOffresProposees'),
    emploiOffresNombre:         num('emploiOffresNombre'),
    emploiProjetProfessionnel:  bool('emploiProjetProfessionnel'),
    emploiProjetFormation:      bool('emploiProjetFormation'),
    emploiCvLm:                 bool('emploiCvLm'),
    emploiEntretiens:           bool('emploiEntretiens'),
    emploiPreparationEntretien: bool('emploiPreparationEntretien'),
    emploiSimulationEntretien:  bool('emploiSimulationEntretien'),
    emploiEchangeFT:            bool('emploiEchangeFT'),
    emploiInscriptionFT:        bool('emploiInscriptionFT'),
    emploiInscriptionJob47:     bool('emploiInscriptionJob47'),
    emploiInscriptionInterim:   bool('emploiInscriptionInterim'),
    emploiEspaceFT:             bool('emploiEspaceFT'),
    emploiPmsmp:                bool('emploiPmsmp'),
    santeRendezVousPASS:        bool('santeRendezVousPASS'),
    santeCss:                   bool('santeCss'),
    santeCssDossier:            bool('santeCssDossier'),
    santeCssOuverture:          bool('santeCssOuverture'),
    santeCarteVitale:           bool('santeCarteVitale'),
    santeAffiliation:           bool('santeAffiliation'),
    santeAffiliationSecu:       bool('santeAffiliationSecu'),
    santeAffiliationMutuelle:   bool('santeAffiliationMutuelle'),
    santeInvalidite:            bool('santeInvalidite'),
    santeRattachementEnfants:   bool('santeRattachementEnfants'),
    santeAme:                   bool('santeAme'),
    santeNumeriqueAmeli:        bool('santeNumeriqueAmeli'),
    santeNumeriqueConsultAmeli: bool('santeNumeriqueConsultAmeli'),
    santeDemarchesEchangeCPAM:  bool('santeDemarchesEchangeCPAM'),
    santeDemarchesImpression:   bool('santeDemarchesImpression'),
    santeDemarchesInfo:         bool('santeDemarchesInfo'),
    santeAccesSoins:            bool('santeAccesSoins'),
    santeMdph:                  bool('santeMdph'),
    santeSuiviSante:            bool('santeSuiviSante'),
    santeBilanSante:            bool('santeBilanSante'),
    santeOrientCpam:            bool('santeOrientCpam'),
    santeOrientCramif:          bool('santeOrientCramif'),
    santeOrientSanteTravail:    bool('santeOrientSanteTravail'),
    santeOrientMdph:            bool('santeOrientMdph'),
    santeOrientPass:            bool('santeOrientPass'),
    santeOrientAddictologie:    bool('santeOrientAddictologie'),
    santeOrientMaisonFemmes:    bool('santeOrientMaisonFemmes'),
    santeOrientGemCmpa:         bool('santeOrientGemCmpa'),
    santeOrientMedecins:        bool('santeOrientMedecins'),
    santeOrientDepistage:       bool('santeOrientDepistage'),
    santeMentale:               bool('santeMentale'),
    santeSoutienPsy:            bool('santeSoutienPsy'),
    mobilitCarteSolidaire:      bool('mobilitCarteSolidaire'),
    mobilitAutoEcole:           bool('mobilitAutoEcole'),
    mobilitAutoEcoleCode:       bool('mobilitAutoEcoleCode'),
    mobilitAutoEcoleConduite:   bool('mobilitAutoEcoleConduite'),
    mobilitBdi:                 bool('mobilitBdi'),
    mobilitBdiPermis:           bool('mobilitBdiPermis'),
    mobilitBdiReparation:       bool('mobilitBdiReparation'),
    mobilitApreva:              bool('mobilitApreva'),
    mobilitItineraire:          bool('mobilitItineraire'),
    mobilitMicroCredit:         bool('mobilitMicroCredit'),
    mobilitCovoiturage:         bool('mobilitCovoiturage'),
    logementHabitatIndigne:     bool('logementHabitatIndigne'),
    logementDemenagement:       bool('logementDemenagement'),
    logementAcces:              bool('logementAcces'),
    logementOrientation:        bool('logementOrientation'),
    logementRecherche:          bool('logementRecherche'),
    numeriqueEspaceNumerique:   bool('numeriqueEspaceNumerique'),
    numeriqueAccompagnement:    bool('numeriqueAccompagnement'),
    numeriqueCoursInfo:         bool('numeriqueCoursInfo'),
    autresInfoConseil:          bool('autresInfoConseil'),
    autresInput:                str('autresInput'),
    isolementLienSocial:        bool('isolementLienSocial'),
    parentaliteSoutien:         bool('parentaliteSoutien'),
    parentaliteModeGarde:       bool('parentaliteModeGarde'),
    parentalitePmi:             bool('parentalitePmi'),
    parentaliteMaisonFamilles:  bool('parentaliteMaisonFamilles'),
    parentaliteMaison1000:      bool('parentaliteMaison1000'),
    parentaliteCafeCulturel:    bool('parentaliteCafeCulturel'),
    parentaliteMissionLocale:   bool('parentaliteMissionLocale'),
    parentaliteAutreInput:      str('parentaliteAutreInput'),
    atelierParticipation:       bool('atelierParticipation'),
    actionCollectiveId:         num('actionCollectiveId'),
    themeAtelierId:             (obj.actionCollective as Record<string, unknown> | null)?.themeId as number | null ?? null,
  }
}
