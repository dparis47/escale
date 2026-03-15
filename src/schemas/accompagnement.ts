import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

// ── Enums ──────────────────────────────────────────────────────────────────

export const NIVEAUX_FORMATION = [
  'PAS_SCOLARISE',
  'PRIMAIRE_3EME',
  'CAP_BAC',
  'DEUG_PLUS',
] as const

export const NIVEAUX_FORMATION_FR: Record<typeof NIVEAUX_FORMATION[number], string> = {
  PAS_SCOLARISE: "N'a pas été scolarisé",
  PRIMAIRE_3EME: 'Primaire à 3ème',
  CAP_BAC:       'CAP/BEP à Bac',
  DEUG_PLUS:     'DEUG et +',
}

export const SUJETS_ENTRETIEN = [
  'SANTE',
  'MOBILITE',
  'EMPLOI',
  'LOGEMENT',
  'ATELIER_REDYNAMISATION',
  'PARENTALITE',
] as const

export const SUJETS_ENTRETIEN_FR: Record<typeof SUJETS_ENTRETIEN[number], string> = {
  SANTE:                  'Santé',
  MOBILITE:               'Mobilité',
  EMPLOI:                 'Emploi',
  LOGEMENT:               'Logement',
  ATELIER_REDYNAMISATION: 'Atelier de redynamisation',
  PARENTALITE:            'Parentalité',
}

export const TYPE_CONTRAT = ['CDI', 'CDD', 'CDDI', 'INTERIM'] as const
export type TypeContratEnum = typeof TYPE_CONTRAT[number]

// ── Schéma SuiviASID (partie ASID d'un accompagnement) ────────────────────

const schemaSuiviASIDBase = z.object({
  prescripteurNom:          z.string().max(100).optional(),
  prescripteurPrenom:       z.string().max(100).optional(),
  referentNom:              z.string().max(100).optional(),
  referentPrenom:           z.string().max(100).optional(),
  communeResidence:         z.string().max(100).optional(),
  dateEntree:               z.string().regex(dateRegex, 'Format YYYY-MM-DD attendu'),
  dateRenouvellement:       z.string().regex(dateRegex).optional(),
  dateRenouvellement2:      z.string().regex(dateRegex).optional(),
  dateSortie:               z.string().regex(dateRegex).optional(),
  orientationNMoins1:       z.boolean().default(false),
  orientationN:             z.boolean().default(false),
  renouvellementN:          z.number().int().min(0).default(0),
  suiviNMoins2EnCours:      z.boolean().default(false),
  suiviRealise:             z.boolean().default(true),
  suiviNonRealiseRaison:    z.string().optional(),
  reorientation:            z.boolean().default(false),
  reorientationDescription: z.string().optional(),
  observation:              z.string().optional(),
})

// ── Schéma création d'un accompagnement (FSE seul ou FSE+ASID) ────────────

export const schemaCreerAccompagnement = z.object({
  // Personne (existante ou à créer inline)
  personId:              z.number().int().positive().optional(),
  personneNom:           z.string().max(100).optional(),
  personnePrenom:        z.string().max(100).optional(),
  personneGenre:         z.enum(['HOMME', 'FEMME']).optional(),
  personneDateNaissance: z.string().regex(dateRegex).optional(),

  dateEntree: z.string().regex(dateRegex, 'Format YYYY-MM-DD attendu'),
  dateSortie: z.string().regex(dateRegex).optional(),

  // Ressources à l'entrée FSE
  ressourceRSA:            z.boolean().default(false),
  ressourceASS:            z.boolean().default(false),
  ressourceARE:            z.boolean().default(false),
  ressourceAAH:            z.boolean().default(false),
  ressourceASI:            z.boolean().default(false),
  ressourceSansRessources: z.boolean().default(false),

  // Situation emploi avant le FSE
  avantOccupeEmploi:       z.boolean().default(false),
  avantCDI:                z.boolean().default(false),
  avantCDDPlus6Mois:       z.boolean().default(false),
  avantCDDMoins6Mois:      z.boolean().default(false),
  avantInterim:            z.boolean().default(false),
  avantIAE:                z.boolean().default(false),
  avantIndependant:        z.boolean().default(false),
  avantFormationPro:       z.boolean().default(false),
  avantEnRechercheEmploi:  z.boolean().default(false),
  avantNeCherchePasEmploi: z.boolean().default(false),

  // Niveau de formation
  niveauFormation: z.enum(NIVEAUX_FORMATION).optional(),

  // Reconnaissance handicap
  reconnaissanceHandicap: z.boolean().default(false),

  // Situation logement
  logementSDF:       z.boolean().default(false),
  logementExclusion: z.boolean().default(false),

  observation: z.string().optional(),

  // Suivi ASID optionnel (absent = FSE seul)
  suiviASID: schemaSuiviASIDBase.optional(),
})

export type CreerAccompagnementInput = z.infer<typeof schemaCreerAccompagnement>

// ── Schéma modification d'un accompagnement (FSE) ─────────────────────────

export const schemaMajAccompagnement = schemaCreerAccompagnement
  .omit({
    personId: true,
    personneNom: true, personnePrenom: true,
    personneGenre: true, personneDateNaissance: true,
    suiviASID: true,
  })
  .partial()
  .extend({
    dateSortie:   z.string().regex(dateRegex).nullable().optional(),
    observation:  z.string().nullable().optional(),
    estBrouillon: z.boolean().optional(),
  })

export type MajAccompagnementInput = z.infer<typeof schemaMajAccompagnement>

// ── Schéma modification d'un SuiviASID ────────────────────────────────────

export const schemaMajSuiviASID = schemaSuiviASIDBase
  .partial()
  .extend({
    prescripteurNom:          z.string().max(100).nullable().optional(),
    prescripteurPrenom:       z.string().max(100).nullable().optional(),
    referentNom:              z.string().max(100).nullable().optional(),
    referentPrenom:           z.string().max(100).nullable().optional(),
    communeResidence:         z.string().max(100).nullable().optional(),
    dateRenouvellement:       z.string().regex(dateRegex).nullable().optional(),
    dateRenouvellement2:      z.string().regex(dateRegex).nullable().optional(),
    dateSortie:               z.string().regex(dateRegex).nullable().optional(),
    observation:              z.string().nullable().optional(),
    suiviNonRealiseRaison:    z.string().nullable().optional(),
    reorientationDescription: z.string().nullable().optional(),
  })

export type MajSuiviASIDInput = z.infer<typeof schemaMajSuiviASID>

// ── Schéma situation de sortie (AccompagnementSortie) ─────────────────────

export const schemaSortie = z.object({
  sortieCDDMoins6Mois:        z.boolean(),
  sortieCDDPlus6Mois:         z.boolean(),
  sortieCDI:                  z.boolean(),
  sortieIAE:                  z.boolean(),
  sortieInterim:              z.boolean(),
  sortieIndependant:          z.boolean(),
  sortieMaintienEmploi:       z.boolean(),
  sortieRechercheEmploi:      z.boolean(),
  sortieInactif:              z.boolean(),
  sortieFormation:            z.boolean(),
  sortieCreationEntreprise:   z.boolean(),
  sortieInfoContratHorsDelai: z.boolean(),
  formationIntitule:          z.string().max(200).nullish(),
  formationOrganisme:         z.string().max(200).nullish(),
  formationVille:             z.string().max(100).nullish(),
  formationDuree:             z.string().max(100).nullish(),
}).partial()

export type SortieInput = z.infer<typeof schemaSortie>

// ── Schéma entretien ───────────────────────────────────────────────────────

export const schemaAjouterEntretien = z.object({
  date:   z.string().regex(dateRegex, 'Format YYYY-MM-DD attendu'),
  sujets: z.array(z.enum(SUJETS_ENTRETIEN)).default([]),
  notes:  z.string().optional(),
})

export type AjouterEntretienInput = z.infer<typeof schemaAjouterEntretien>

// ── Schéma démarches ───────────────────────────────────────────────────────

export const schemaMajDemarches = z.object({
  // ACCES AUX DROITS
  droitsCafMsa:               z.boolean(),

  // EMPLOI
  emploiRechercheEmploi:      z.boolean(),
  emploiConsultationOffres:   z.boolean(),
  emploiCandidatures:         z.boolean(),
  emploiOffresProposees:      z.boolean(),
  emploiOffresNombre:         z.number().int().nonnegative().nullish(),
  emploiProjetProfessionnel:  z.boolean(),
  emploiProjetFormation:      z.boolean(),
  emploiCvLm:                 z.boolean(),
  emploiEntretiens:           z.boolean(),
  emploiPreparationEntretien: z.boolean(),
  emploiSimulationEntretien:  z.boolean(),
  emploiEchangeFT:            z.boolean(),
  emploiInscriptionFT:        z.boolean(),
  emploiInscriptionJob47:     z.boolean(),
  emploiInscriptionInterim:   z.boolean(),
  emploiEspaceFT:             z.boolean(),
  emploiPmsmp:                z.boolean(),

  // SANTE
  santeRendezVousPASS:        z.boolean(),
  santeCss:                   z.boolean(),
  santeCssDossier:            z.boolean(),
  santeCssOuverture:          z.boolean(),
  santeCarteVitale:           z.boolean(),
  santeAffiliation:           z.boolean(),
  santeAffiliationSecu:       z.boolean(),
  santeAffiliationMutuelle:   z.boolean(),
  santeInvalidite:            z.boolean(),
  santeRattachementEnfants:   z.boolean(),
  santeAme:                   z.boolean(),
  santeNumeriqueAmeli:        z.boolean(),
  santeNumeriqueConsultAmeli: z.boolean(),
  santeDemarchesEchangeCPAM:  z.boolean(),
  santeDemarchesImpression:   z.boolean(),
  santeDemarchesInfo:         z.boolean(),
  santeAccesSoins:            z.boolean(),
  santeMdph:                  z.boolean(),
  santeSuiviSante:            z.boolean(),
  santeBilanSante:            z.boolean(),
  santeOrientCpam:            z.boolean(),
  santeOrientCramif:          z.boolean(),
  santeOrientSanteTravail:    z.boolean(),
  santeOrientMdph:            z.boolean(),
  santeOrientPass:            z.boolean(),
  santeOrientAddictologie:    z.boolean(),
  santeOrientMaisonFemmes:    z.boolean(),
  santeOrientGemCmpa:         z.boolean(),
  santeOrientMedecins:        z.boolean(),
  santeOrientDepistage:       z.boolean(),
  santeMentale:               z.boolean(),
  santeSoutienPsy:            z.boolean(),

  // MOBILITE
  mobilitCarteSolidaire:      z.boolean(),
  mobilitAutoEcole:           z.boolean(),
  mobilitAutoEcoleCode:       z.boolean(),
  mobilitAutoEcoleConduite:   z.boolean(),
  mobilitBdi:                 z.boolean(),
  mobilitBdiPermis:           z.boolean(),
  mobilitBdiReparation:       z.boolean(),
  mobilitApreva:              z.boolean(),
  mobilitItineraire:          z.boolean(),
  mobilitMicroCredit:         z.boolean(),
  mobilitCovoiturage:         z.boolean(),

  // LOGEMENT
  logementHabitatIndigne:     z.boolean(),
  logementDemenagement:       z.boolean(),
  logementAcces:              z.boolean(),
  logementOrientation:        z.boolean(),
  logementRecherche:          z.boolean(),

  // INCLUSION NUMERIQUE
  numeriqueEspaceNumerique:   z.boolean(),
  numeriqueAccompagnement:    z.boolean(),
  numeriqueCoursInfo:         z.boolean(),

  // AUTRES
  autresInfoConseil:          z.boolean(),
  autresInput:                z.string().max(500).nullish(),

  // LUTTE CONTRE L'ISOLEMENT
  isolementLienSocial:        z.boolean(),

  // PARENTALITE
  parentaliteSoutien:         z.boolean(),
  parentaliteModeGarde:       z.boolean(),
  parentalitePmi:             z.boolean(),
  parentaliteMaisonFamilles:  z.boolean(),
  parentaliteMaison1000:      z.boolean(),
  parentaliteCafeCulturel:    z.boolean(),
  parentaliteMissionLocale:   z.boolean(),
  parentaliteAutreInput:      z.string().max(500).nullish(),

  // ATELIERS DE REDYNAMISATION
  atelierParticipation:       z.boolean(),
  actionCollectiveId:         z.number().int().positive().nullish(),
}).partial()

export type MajDemarchesInput = z.infer<typeof schemaMajDemarches>

// ── Schéma contrat de travail ───────────────────────────────────────────────

export const schemaContratTravail = z.object({
  type:      z.enum(TYPE_CONTRAT),
  dateDebut: z.string().regex(dateRegex, 'Format YYYY-MM-DD attendu'),
  dateFin:   z.string().regex(dateRegex).optional(),
  employeur: z.string().max(200).optional(),
  ville:     z.string().max(200).optional(),
  poste:     z.string().max(200).optional(),
})

export type ContratTravailInput = z.infer<typeof schemaContratTravail>
