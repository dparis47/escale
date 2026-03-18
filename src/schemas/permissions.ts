import { z } from 'zod'
import { MODULES, type Module } from '@/lib/permissions'

// Génère dynamiquement le schéma Zod à partir de la définition des modules
const moduleSchemas: Record<string, z.ZodOptional<z.ZodObject<Record<string, z.ZodOptional<z.ZodBoolean>>>>> = {}

for (const [mod, features] of Object.entries(MODULES)) {
  const featureShape: Record<string, z.ZodOptional<z.ZodBoolean>> = {}
  for (const feat of features) {
    featureShape[feat] = z.boolean().optional()
  }
  moduleSchemas[mod] = z.object(featureShape).optional()
}

export const schemaPermissionsOverrides = z.object(
  moduleSchemas as Record<Module, z.ZodOptional<z.ZodObject<Record<string, z.ZodOptional<z.ZodBoolean>>>>>
)

export type PermissionsOverridesInput = z.infer<typeof schemaPermissionsOverrides>
