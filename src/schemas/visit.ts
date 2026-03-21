import { z } from 'zod'

export const schemaDemarcheVisite = z.object({
  // ACCES AUX DROITS
  droitsCafMsa:               z.boolean().default(false),

  // EMPLOI
  emploiRechercheEmploi:      z.boolean().default(false),
  emploiConsultationOffres:   z.boolean().default(false),
  emploiCandidatures:         z.boolean().default(false),
  emploiOffresProposees:      z.boolean().default(false),
  emploiOffresNombre:         z.number().int().nonnegative().nullish(),
  emploiProjetProfessionnel:  z.boolean().default(false),
  emploiProjetFormation:      z.boolean().default(false),
  emploiCvLm:                 z.boolean().default(false),
  emploiEntretiens:           z.boolean().default(false),
  emploiPreparationEntretien: z.boolean().default(false),
  emploiSimulationEntretien:  z.boolean().default(false),
  emploiEchangeFT:            z.boolean().default(false),
  emploiInscriptionFT:        z.boolean().default(false),
  emploiInscriptionJob47:     z.boolean().default(false),
  emploiInscriptionInterim:   z.boolean().default(false),
  emploiEspaceFT:             z.boolean().default(false),
  emploiPmsmp:                z.boolean().default(false),

  // SANTE
  santeRendezVousPASS:        z.boolean().default(false),
  santeCss:                   z.boolean().default(false),
  santeCssDossier:            z.boolean().default(false),
  santeCssOuverture:          z.boolean().default(false),
  santeCarteVitale:           z.boolean().default(false),
  santeAffiliation:           z.boolean().default(false),
  santeAffiliationSecu:       z.boolean().default(false),
  santeAffiliationMutuelle:   z.boolean().default(false),
  santeInvalidite:            z.boolean().default(false),
  santeRattachementEnfants:   z.boolean().default(false),
  santeAme:                   z.boolean().default(false),
  santeNumeriqueAmeli:        z.boolean().default(false),
  santeNumeriqueConsultAmeli: z.boolean().default(false),
  santeDemarchesEchangeCPAM:  z.boolean().default(false),
  santeDemarchesImpression:   z.boolean().default(false),
  santeDemarchesInfo:         z.boolean().default(false),
  santeAccesSoins:            z.boolean().default(false),
  santeMdph:                  z.boolean().default(false),
  santeSuiviSante:            z.boolean().default(false),
  santeBilanSante:            z.boolean().default(false),
  santeOrientCpam:            z.boolean().default(false),
  santeOrientCramif:          z.boolean().default(false),
  santeOrientSanteTravail:    z.boolean().default(false),
  santeOrientMdph:            z.boolean().default(false),
  santeOrientPass:            z.boolean().default(false),
  santeOrientAddictologie:    z.boolean().default(false),
  santeOrientMaisonFemmes:    z.boolean().default(false),
  santeOrientGemCmpa:         z.boolean().default(false),
  santeOrientMedecins:        z.boolean().default(false),
  santeOrientDepistage:       z.boolean().default(false),
  santeMentale:               z.boolean().default(false),
  santeSoutienPsy:            z.boolean().default(false),

  // MOBILITE
  mobilitCarteSolidaire:      z.boolean().default(false),
  mobilitAutoEcole:           z.boolean().default(false),
  mobilitAutoEcoleCode:       z.boolean().default(false),
  mobilitAutoEcoleConduite:   z.boolean().default(false),
  mobilitBdi:                 z.boolean().default(false),
  mobilitBdiPermis:           z.boolean().default(false),
  mobilitBdiReparation:       z.boolean().default(false),
  mobilitApreva:              z.boolean().default(false),
  mobilitItineraire:          z.boolean().default(false),
  mobilitMicroCredit:         z.boolean().default(false),
  mobilitCovoiturage:         z.boolean().default(false),

  // LOGEMENT
  logementHabitatIndigne:     z.boolean().default(false),
  logementDemenagement:       z.boolean().default(false),
  logementAcces:              z.boolean().default(false),
  logementOrientation:        z.boolean().default(false),
  logementRecherche:          z.boolean().default(false),

  // INCLUSION NUMERIQUE
  numeriqueEspaceNumerique:   z.boolean().default(false),
  numeriqueAccompagnement:    z.boolean().default(false),
  numeriqueCoursInfo:         z.boolean().default(false),

  // AUTRES
  autresInfoConseil:          z.boolean().default(false),
  autresInput:                z.string().max(500).nullish(),

  // LUTTE CONTRE L'ISOLEMENT
  isolementLienSocial:        z.boolean().default(false),

  // PARENTALITE
  parentaliteSoutien:         z.boolean().default(false),
  parentaliteModeGarde:       z.boolean().default(false),
  parentalitePmi:             z.boolean().default(false),
  parentaliteMaisonFamilles:  z.boolean().default(false),
  parentaliteMaison1000:      z.boolean().default(false),
  parentaliteCafeCulturel:    z.boolean().default(false),
  parentaliteMissionLocale:   z.boolean().default(false),
  parentaliteAutreInput:      z.string().max(500).nullish(),

  // ATELIERS DE REDYNAMISATION
  atelierParticipation:       z.boolean().default(false),
  themeAtelierIds:            z.array(z.number().int().positive()).optional().default([]),
})

export const schemaCreerVisite = z.object({
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date invalide (YYYY-MM-DD)'),
  genre:        z.enum(['HOMME', 'FEMME']),
  personId:     z.number().int().positive().optional(),
  nom:          z.string().max(100).optional(),
  prenom:       z.string().max(100).optional(),
  orienteParFT: z.boolean().default(false),
  partenaires:  z.array(z.string().max(100)).default([]),
  commentaire:  z.string().max(500).optional(),
  demarches:    schemaDemarcheVisite.optional(),
  // FSE
  fse:          z.boolean().optional(),
})

export const schemaMajVisite = z.object({
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date invalide (YYYY-MM-DD)').optional(),
  genre:        z.enum(['HOMME', 'FEMME']).optional(),
  nom:          z.string().max(100).nullish(),
  prenom:       z.string().max(100).nullish(),
  orienteParFT: z.boolean().optional(),
  partenaires:  z.array(z.string().max(100)).optional(),
  commentaire:  z.string().max(500).nullish(),
  demarches:    schemaDemarcheVisite.optional(),
  // FSE
  fse:          z.boolean().optional(),
})

export type CreerVisiteInput = z.infer<typeof schemaCreerVisite>
export type MajVisiteInput   = z.infer<typeof schemaMajVisite>
export type DemarcheVisiteInput = z.infer<typeof schemaDemarcheVisite>
