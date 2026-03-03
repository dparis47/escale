import { z } from 'zod'
import type { ThemeAtelier } from '@prisma/client'

export const THEMES_ATELIER_FR: Record<ThemeAtelier, string> = {
  COURS_INFORMATIQUE:  'Cours informatique',
  CINEMA:              'Cinéma',
  SOCIO_ESTHETIQUE:    'Socio-esthétique',
  RANDONNEE:           'Randonnée',
  SPORT:               'Sport',
  PISCINE:             'Piscine',
  BUDGET:              'Budget',
  SANTE_ENVIRONNEMENT: 'Santé / Environnement',
  CUISINE:             'Cuisine',
  CUISINE_ANTI_GASPI:  'Cuisine anti-gaspi',
  MEDIATION_EQUINE:    'Médiation équine',
  ATELIER_CREATIF:     'Ateliers créatifs',
  CULTUREL:            'Culturel',
  NOEL:                'Noël',
  PROJET_CINEMA:       'Projet cinéma',
  AUTRE:               'Autre',
}

export const THEMES_ATELIER_VALUES = Object.keys(THEMES_ATELIER_FR) as [ThemeAtelier, ...ThemeAtelier[]]

// Classes Tailwind complètes (nécessaires pour que le compilateur les inclue)
export const COULEURS_THEME: Record<ThemeAtelier, { bg: string; text: string; sub: string }> = {
  COURS_INFORMATIQUE:  { bg: 'bg-blue-50',    text: 'text-blue-700',    sub: 'text-blue-500'    },
  CINEMA:              { bg: 'bg-purple-50',  text: 'text-purple-700',  sub: 'text-purple-500'  },
  SOCIO_ESTHETIQUE:    { bg: 'bg-pink-50',    text: 'text-pink-700',    sub: 'text-pink-500'    },
  RANDONNEE:           { bg: 'bg-green-50',   text: 'text-green-700',   sub: 'text-green-500'   },
  SPORT:               { bg: 'bg-orange-50',  text: 'text-orange-700',  sub: 'text-orange-500'  },
  PISCINE:             { bg: 'bg-sky-50',     text: 'text-sky-700',     sub: 'text-sky-500'     },
  BUDGET:              { bg: 'bg-amber-50',   text: 'text-amber-700',   sub: 'text-amber-500'   },
  SANTE_ENVIRONNEMENT: { bg: 'bg-teal-50',    text: 'text-teal-700',    sub: 'text-teal-500'    },
  CUISINE:             { bg: 'bg-red-50',     text: 'text-red-700',     sub: 'text-red-500'     },
  CUISINE_ANTI_GASPI:  { bg: 'bg-lime-50',    text: 'text-lime-700',    sub: 'text-lime-500'    },
  MEDIATION_EQUINE:    { bg: 'bg-stone-50',   text: 'text-stone-700',   sub: 'text-stone-500'   },
  ATELIER_CREATIF:     { bg: 'bg-yellow-50',  text: 'text-yellow-700',  sub: 'text-yellow-500'  },
  CULTUREL:            { bg: 'bg-indigo-50',  text: 'text-indigo-700',  sub: 'text-indigo-500'  },
  NOEL:                { bg: 'bg-rose-50',    text: 'text-rose-700',    sub: 'text-rose-500'    },
  PROJET_CINEMA:       { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', sub: 'text-fuchsia-500' },
  AUTRE:               { bg: 'bg-gray-100',   text: 'text-gray-700',    sub: 'text-gray-500'    },
}

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const schemaCreerAtelier = z.object({
  theme:       z.enum(THEMES_ATELIER_VALUES),
  prestataire: z.string().max(200).optional(),
  lieu:        z.string().max(200).optional(),
  seances:     z.array(z.object({
    date:       z.string().regex(dateRegex, 'Date invalide (YYYY-MM-DD)'),
    themeAutre: z.string().max(200).optional(),
  })).min(1, 'Au moins une séance est requise'),
  notes:       z.string().optional(),
})

export const schemaMajAtelier = z.object({
  theme:       z.enum(THEMES_ATELIER_VALUES).optional(),
  themeAutre:  z.string().max(200).optional(),
  prestataire: z.string().max(200).optional(),
  lieu:        z.string().max(200).optional(),
  date:        z.string().regex(dateRegex, 'Date invalide (YYYY-MM-DD)').optional(),
  notes:       z.string().optional(),
})

export type CreerAtelierInput = z.infer<typeof schemaCreerAtelier>
export type MajAtelierInput   = z.infer<typeof schemaMajAtelier>
