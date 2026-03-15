import { z } from 'zod'
import { schemaPermissionsOverrides } from '@/schemas/permissions'

export const schemaCreerUtilisateur = z.object({
  nom:      z.string().min(1, 'Le nom est requis').max(100),
  prenom:   z.string().min(1, 'Le prénom est requis').max(100),
  email:    z.string().email('Email invalide'),
  password: z.string().min(6, '6 caractères minimum').max(100),
  role:     z.enum(['ACCUEIL', 'TRAVAILLEUR_SOCIAL', 'DIRECTION', 'ADMIN']),
})

export const schemaMajUtilisateur = z.object({
  nom:      z.string().min(1).max(100).optional(),
  prenom:   z.string().min(1).max(100).optional(),
  email:    z.string().email('Email invalide').optional(),
  password: z.string().min(6, '6 caractères minimum').max(100).optional(),
  role:     z.enum(['ACCUEIL', 'TRAVAILLEUR_SOCIAL', 'DIRECTION', 'ADMIN']).optional(),
  permissionsOverrides: schemaPermissionsOverrides.nullable().optional(),
})

export type CreerUtilisateurInput = z.infer<typeof schemaCreerUtilisateur>
export type MajUtilisateurInput = z.infer<typeof schemaMajUtilisateur>
