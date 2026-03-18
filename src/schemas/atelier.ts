import { z } from 'zod'

// ============================================================
// Couleurs par catégorie (classes Tailwind statiques)
// ============================================================

export const COULEURS_CATEGORIE: Record<string, { bg: string; text: string; sub: string }> = {
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-700',   sub: 'text-pink-500'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  sub: 'text-green-500'  },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    sub: 'text-red-500'    },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  sub: 'text-amber-500'  },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', sub: 'text-indigo-500' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   sub: 'text-blue-500'   },
  sky:    { bg: 'bg-sky-50',    text: 'text-sky-700',    sub: 'text-sky-500'    },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   sub: 'text-teal-500'   },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', sub: 'text-orange-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', sub: 'text-purple-500' },
  gray:   { bg: 'bg-gray-100',  text: 'text-gray-700',   sub: 'text-gray-500'   },
}

export const COULEURS_DISPONIBLES = Object.keys(COULEURS_CATEGORIE)

// ============================================================
// Types pour catégories et thèmes (données dynamiques depuis la DB)
// ============================================================

export type ThemeOption = {
  id: number
  nom: string
  ordre: number
  _count?: { ateliers: number }
}

export type CategorieAvecThemes = {
  id: number
  nom: string
  couleur: string
  ordre: number
  themes: ThemeOption[]
}

export type PrestataireOption = {
  id: number
  nom: string
}

// ============================================================
// Schémas Zod — Ateliers
// ============================================================

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const schemaCreerAtelier = z.object({
  themeId:       z.number().int().positive({ message: 'Thème requis' }),
  prestataireId: z.number().int().positive().optional(),
  lieu:          z.string().max(200).optional(),
  seances:       z.array(z.object({
    date:       z.string().regex(dateRegex, 'Date invalide (YYYY-MM-DD)'),
    themeAutre: z.string().max(200).optional(),
  })).min(1, 'Au moins une séance est requise'),
  notes:         z.string().optional(),
})

export const schemaMajAtelier = z.object({
  themeId:       z.number().int().positive().optional(),
  themeAutre:    z.string().max(200).optional(),
  prestataireId: z.number().int().positive().nullable().optional(),
  lieu:          z.string().max(200).optional(),
  date:          z.string().regex(dateRegex, 'Date invalide (YYYY-MM-DD)').optional(),
  notes:         z.string().optional(),
})

// ============================================================
// Types sérialisables pour le composant client TableauAteliers
// ============================================================

export interface SessionAtelierData {
  id: number
  date: string          // pré-formaté (ex: "20 fév. 2024")
  themeAutre: string | null
  themeId: number
  prestataireId: number | null
  fichiers: { id: number; nom: string }[]
  nbParticipants: number
}

export interface GroupeAtelierData {
  prestataireNom: string | null
  themeNom: string
  lieu: string | null
  sessions: SessionAtelierData[]
}

export interface CategorieAtelierData {
  id: number
  nom: string
  couleur: string
  ordre: number
  themes: ThemeOption[]
  groupes: GroupeAtelierData[]
}

export type CreerAtelierInput = z.infer<typeof schemaCreerAtelier>
export type MajAtelierInput   = z.infer<typeof schemaMajAtelier>

// ============================================================
// Schémas Zod — Catégories
// ============================================================

export const schemaCreerCategorie = z.object({
  nom:        z.string().min(1, 'Nom requis').max(100),
  couleur:    z.string().max(20).default('gray'),
  themes:     z.array(z.string().min(1).max(100)).min(1, 'Au moins un thème est requis'),
  apresOrdre: z.number().int().optional(),
})

export const schemaMajCategorie = z.object({
  nom:     z.string().min(1).max(100).optional(),
  couleur: z.string().max(20).optional(),
  // Gestion des thèmes : ajout, renommage, suppression
  themesAjoutes:    z.array(z.string().min(1).max(100)).optional(),
  themesRenommes:   z.array(z.object({
    id:  z.number().int().positive(),
    nom: z.string().min(1).max(100),
  })).optional(),
  themesSupprimes:  z.array(z.number().int().positive()).optional(),
})

// ============================================================
// Schémas Zod — Prestataires
// ============================================================

export const schemaCreerPrestataire = z.object({
  nom: z.string().min(1, 'Nom requis').max(200),
})

export const schemaMajPrestataire = z.object({
  nom: z.string().min(1, 'Nom requis').max(200),
})
