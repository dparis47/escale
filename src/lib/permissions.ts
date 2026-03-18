import type { Role } from '@prisma/client'

// ──────────────────────────────────────────────
// Définition des modules et fonctionnalités
// ──────────────────────────────────────────────

export const MODULES = {
  tableau_journalier:  ['creer_visite', 'modifier_visite', 'supprimer_visite', 'exporter', 'importer'] as const,
  accueil_partenaires: ['saisir', 'exporter', 'importer'] as const,
  dossiers:            ['voir', 'creer', 'modifier', 'supprimer_auto', 'supprimer', 'supprimer_avec_accompagnement', 'exporter', 'importer'] as const,
  accompagnements:     ['voir', 'creer_modifier', 'supprimer', 'exporter', 'importer'] as const,
  ateliers:            ['voir', 'creer_modifier', 'supprimer', 'ajouter_seance', 'gerer_participants', 'exporter', 'importer'] as const,
  config_ateliers:     ['gerer'] as const,
  bilans:              ['voir', 'exporter'] as const,
  utilisateurs:        ['gerer'] as const,
  archives:            ['voir', 'restaurer', 'purger'] as const,
  audit:               ['consulter'] as const,
} as const

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Module = keyof typeof MODULES

export type Feature<M extends Module = Module> = (typeof MODULES)[M][number]

export type Permissions = {
  [M in Module]: { [F in (typeof MODULES)[M][number]]: boolean }
}

export type PermissionsOverrides = {
  [M in Module]?: { [F in (typeof MODULES)[M][number]]?: boolean }
}

// ──────────────────────────────────────────────
// Labels FR pour l'UI
// ──────────────────────────────────────────────

export const MODULES_FR: Record<Module, string> = {
  tableau_journalier:  'Tableau journalier',
  accueil_partenaires: 'Accueil partenaires',
  dossiers:            'Dossiers individuels',
  accompagnements:     'Accompagnements',
  ateliers:            'Actions collectives',
  config_ateliers:     'Configuration ateliers',
  bilans:              'Bilans',
  utilisateurs:        'Utilisateurs',
  archives:            'Archives',
  audit:               'Audit',
}

export const FEATURES_FR: Record<string, string> = {
  creer_visite:       'Créer une visite',
  modifier_visite:    'Modifier une visite',
  supprimer_visite:   'Supprimer une visite',
  exporter:           'Exporter',
  importer:           'Importer',
  saisir:             'Saisir',
  voir:               'Voir',
  creer:              'Créer',
  modifier:           'Modifier',
  supprimer_auto:                'Supprimer (auto-générés)',
  supprimer:                     'Supprimer',
  supprimer_avec_accompagnement: 'Supprimer (avec accompagnement)',
  creer_modifier:     'Créer / Modifier',
  ajouter_seance:     'Ajouter une séance',
  gerer_participants: 'Gérer les participants',
  gerer:              'Gérer',
  restaurer:          'Restaurer',
  purger:             'Purger les archives',
  consulter:          'Consulter',
}

// ──────────────────────────────────────────────
// Helpers pour construire les permissions
// ──────────────────────────────────────────────

/** Crée un objet permissions pour un module avec toutes les features à false */
function modulVide<M extends Module>(mod: M): Permissions[M] {
  const result: Record<string, boolean> = {}
  for (const f of MODULES[mod]) {
    result[f] = false
  }
  return result as Permissions[M]
}

/** Crée un objet permissions pour un module avec les features spécifiées à true */
function modulAvec<M extends Module>(mod: M, features: readonly string[]): Permissions[M] {
  const result = modulVide(mod)
  for (const f of features) {
    if (f in result) {
      (result as Record<string, boolean>)[f] = true
    }
  }
  return result
}

/** Crée un objet permissions pour un module avec toutes les features à true */
function modulComplet<M extends Module>(mod: M): Permissions[M] {
  return modulAvec(mod, MODULES[mod] as unknown as string[])
}

// ──────────────────────────────────────────────
// Permissions par défaut par rôle
// ──────────────────────────────────────────────

const DEFAUT_ACCUEIL: Permissions = {
  tableau_journalier:  modulAvec('tableau_journalier', ['creer_visite', 'modifier_visite', 'supprimer_visite', 'exporter']),
  accueil_partenaires: modulAvec('accueil_partenaires', ['saisir']),
  dossiers:            modulAvec('dossiers', ['voir', 'creer', 'modifier', 'supprimer_auto']),
  accompagnements:     modulVide('accompagnements'),
  ateliers:            modulAvec('ateliers', ['voir', 'ajouter_seance']),
  config_ateliers:     modulVide('config_ateliers'),
  bilans:              modulVide('bilans'),
  utilisateurs:        modulVide('utilisateurs'),
  archives:            modulVide('archives'),
  audit:               modulVide('audit'),
}

const DEFAUT_TS: Permissions = {
  tableau_journalier:  modulAvec('tableau_journalier', ['creer_visite', 'modifier_visite', 'supprimer_visite', 'exporter']),
  accueil_partenaires: modulAvec('accueil_partenaires', ['saisir', 'exporter']),
  dossiers:            modulAvec('dossiers', ['voir', 'creer', 'modifier', 'supprimer_auto', 'supprimer', 'exporter']),
  accompagnements:     modulAvec('accompagnements', ['voir', 'creer_modifier', 'exporter']),
  ateliers:            modulAvec('ateliers', ['voir', 'creer_modifier', 'supprimer', 'ajouter_seance', 'gerer_participants', 'exporter']),
  config_ateliers:     modulComplet('config_ateliers'),
  bilans:              modulComplet('bilans'),
  utilisateurs:        modulVide('utilisateurs'),
  archives:            modulVide('archives'),
  audit:               modulVide('audit'),
}

const DEFAUT_DIRECTION: Permissions = {
  tableau_journalier:  modulAvec('tableau_journalier', ['creer_visite', 'modifier_visite', 'supprimer_visite', 'exporter']),
  accueil_partenaires: modulAvec('accueil_partenaires', ['saisir', 'exporter']),
  dossiers:            modulAvec('dossiers', ['voir', 'creer', 'modifier', 'supprimer_auto', 'supprimer', 'exporter']),
  accompagnements:     modulAvec('accompagnements', ['voir', 'creer_modifier', 'exporter']),
  ateliers:            modulAvec('ateliers', ['voir', 'creer_modifier', 'supprimer', 'ajouter_seance', 'gerer_participants', 'exporter']),
  config_ateliers:     modulComplet('config_ateliers'),
  bilans:              modulComplet('bilans'),
  utilisateurs:        modulVide('utilisateurs'),
  archives:            modulVide('archives'),
  audit:               modulVide('audit'),
}

const DEFAUT_ADMIN: Permissions = {
  tableau_journalier:  modulComplet('tableau_journalier'),
  accueil_partenaires: modulComplet('accueil_partenaires'),
  dossiers:            modulComplet('dossiers'),
  accompagnements:     modulComplet('accompagnements'),
  ateliers:            modulComplet('ateliers'),
  config_ateliers:     modulComplet('config_ateliers'),
  bilans:              modulComplet('bilans'),
  utilisateurs:        modulComplet('utilisateurs'),
  archives:            modulComplet('archives'),
  audit:               modulComplet('audit'),
}

export const PERMISSIONS_PAR_DEFAUT: Record<Role, Permissions> = {
  ACCUEIL:             DEFAUT_ACCUEIL,
  TRAVAILLEUR_SOCIAL:  DEFAUT_TS,
  DIRECTION:           DEFAUT_DIRECTION,
  ADMIN:               DEFAUT_ADMIN,
}

// ──────────────────────────────────────────────
// Résolution : défauts + overrides
// ──────────────────────────────────────────────

export function resoudrePermissions(role: Role, overrides?: PermissionsOverrides | null): Permissions {
  const defauts = PERMISSIONS_PAR_DEFAUT[role]
  if (!overrides) return defauts

  // Clone profond des défauts puis applique les overrides
  const result = {} as Record<string, Record<string, boolean>>
  for (const mod of Object.keys(MODULES) as Module[]) {
    result[mod] = { ...(defauts[mod] as Record<string, boolean>) }
    const modOverrides = overrides[mod]
    if (modOverrides) {
      for (const [feat, val] of Object.entries(modOverrides)) {
        if (feat in result[mod] && typeof val === 'boolean') {
          result[mod][feat] = val
        }
      }
    }
  }
  return result as unknown as Permissions
}

// ──────────────────────────────────────────────
// Vérification d'accès
// ──────────────────────────────────────────────

interface SessionAvecPermissions {
  user: { permissions: Permissions }
}

/**
 * Vérifie si l'utilisateur a accès à un module ou une fonctionnalité.
 * - Sans feature : retourne true si au moins une feature du module est activée
 * - Avec feature : retourne true si cette feature spécifique est activée
 */
export function peutAcceder(
  session: SessionAvecPermissions | null,
  module: Module,
  feature?: string,
): boolean {
  if (!session) return false

  const permsModule = session.user.permissions[module] as Record<string, boolean> | undefined
  if (!permsModule) return false

  if (feature) {
    return permsModule[feature] === true
  }

  // Module-level : true si au moins une feature est activée
  return Object.values(permsModule).some((v) => v === true)
}
