import { z } from 'zod'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const SITUATIONS = ['MARIE', 'CELIBATAIRE', 'DIVORCE', 'SEPARE', 'CONCUBINAGE', 'VEUF', 'PARENT_ISOLE'] as const
const RESSOURCES  = ['ARE', 'ASS', 'RSA', 'AAH', 'INVALIDITE', 'IJ', 'ASI', 'SALAIRE', 'CONJOINT', 'SANS_RESSOURCE'] as const
const ORIENTE_PAR = ['FRANCE_TRAVAIL', 'CMS', 'MAIRIE', 'CONNAISSANCE', 'CMPA', 'MAISON_DES_FAMILLES'] as const

const schemaDate = z.string().regex(DATE_RE, 'Format date invalide (YYYY-MM-DD)')
const schemaEmail = z
  .string()
  .email('Email invalide')
  .max(200)
  .optional()
  .or(z.literal(''))

export const schemaCreerPersonne = z.object({
  // Identité
  nom:               z.string().min(1, 'Nom requis').max(100),
  prenom:            z.string().min(1, 'Prénom requis').max(100),
  genre:             z.enum(['HOMME', 'FEMME'], { message: 'Genre requis' }),
  dateNaissance:     schemaDate.optional(),
  nationalite:       z.string().max(100).optional(),

  // Contact
  adresse:           z.string().max(300).optional(),
  telephone:         z.string().max(20).optional(),
  mobile:            z.string().max(20).optional(),
  email:             schemaEmail,

  // Santé
  css:                 z.boolean().default(false),
  rqth:                z.boolean().default(false),
  invalidite:          z.boolean().default(false),
  categorieInvalidite: z.string().max(100).optional(),
  numeroSecu:          z.string().max(50).optional(),

  // France Travail
  numeroFT:          z.string().max(50).optional(),
  dateInscriptionFT: schemaDate.optional(),
  codepersonnelFT:   z.string().max(50).optional(),
  accoGlo:           z.boolean().default(false),

  // CAF
  numeroCAF:         z.string().max(50).optional(),

  // Situation familiale
  situationFamiliale:    z.enum(SITUATIONS).optional(),
  nombreEnfantsCharge:   z.number().int().min(0).optional(),
  agesEnfants:           z.array(z.number().int().min(0).max(30)).default([]),

  // Mobilité
  permisConduire:        z.boolean().default(false),
  vehiculePersonnel:     z.boolean().default(false),
  autresMoyensLocomotion: z.string().max(200).optional(),

  // Hébergement (valeur parmi les options prédéfinies ou null)
  hebergement:           z.string().max(200).optional(),

  // Ressources et orientation
  ressources:            z.array(z.enum(RESSOURCES)).default([]),
  orientePar:            z.enum(ORIENTE_PAR).optional(),
  enASID:                z.boolean().default(false),
})

// Pour PATCH : tous les champs deviennent optionnels, les champs texte nullable acceptent null
export const schemaMajPersonne = schemaCreerPersonne.partial().extend({
  nationalite:            z.string().max(100).nullable().optional(),
  adresse:                z.string().max(300).nullable().optional(),
  telephone:              z.string().max(20).nullable().optional(),
  mobile:                 z.string().max(20).nullable().optional(),
  categorieInvalidite:    z.string().max(100).nullable().optional(),
  numeroSecu:             z.string().max(50).nullable().optional(),
  numeroFT:               z.string().max(50).nullable().optional(),
  codepersonnelFT:        z.string().max(50).nullable().optional(),
  numeroCAF:              z.string().max(50).nullable().optional(),
  autresMoyensLocomotion: z.string().max(200).nullable().optional(),
  hebergement:            z.string().max(200).nullable().optional(),
})

export type CreerPersonneInput = z.infer<typeof schemaCreerPersonne>
export type MajPersonneInput   = z.infer<typeof schemaMajPersonne>

// Labels FR pour l'affichage
export const SITUATIONS_FR: Record<typeof SITUATIONS[number], string> = {
  MARIE:        'Marié(e)',
  CELIBATAIRE:  'Célibataire',
  DIVORCE:      'Divorcé(e)',
  SEPARE:       'Séparé(e)',
  CONCUBINAGE:  'Concubinage',
  VEUF:         'Veuf(ve)',
  PARENT_ISOLE: 'Parent isolé',
}

export const RESSOURCES_FR: Record<typeof RESSOURCES[number], string> = {
  ARE:          'ARE',
  ASS:          'ASS',
  RSA:          'RSA',
  AAH:          'AAH',
  INVALIDITE:   'Invalidité',
  IJ:           'IJ',
  ASI:          'ASI',
  SALAIRE:      'Salaire',
  CONJOINT:     'Conjoint',
  SANS_RESSOURCE: 'Sans ressource',
}

export const ORIENTE_PAR_FR: Record<typeof ORIENTE_PAR[number], string> = {
  FRANCE_TRAVAIL:     'France Travail',
  CMS:                'CMS',
  MAIRIE:             'Mairie',
  CONNAISSANCE:       'Connaissance',
  CMPA:               'CMPA',
  MAISON_DES_FAMILLES: 'Maison des Familles',
}

export const RESSOURCES_OPTIONS = RESSOURCES.map((r) => ({ value: r, label: RESSOURCES_FR[r] }))
export const SITUATIONS_OPTIONS  = SITUATIONS.map((s) => ({ value: s, label: SITUATIONS_FR[s] }))
export const ORIENTE_PAR_OPTIONS = ORIENTE_PAR.map((o) => ({ value: o, label: ORIENTE_PAR_FR[o] }))

export const HEBERGEMENT_OPTIONS = [
  'Locataire',
  'Propriétaire',
  'Hébergé chez des amis',
  'Hébergé dans la famille',
  'Domiciliation CCAS',
] as const
