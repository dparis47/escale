import { describe, it, expect } from 'vitest'
import {
  peutAcceder,
  resoudrePermissions,
  PERMISSIONS_PAR_DEFAUT,
  MODULES,
  type Permissions,
} from '@/lib/permissions'
import type { Role } from '@prisma/client'

// ──────────────────────────────────────────────
// Helper : crée une session simulée pour un rôle
// ──────────────────────────────────────────────

function session(role: Role, overrides?: Record<string, Record<string, boolean>> | null) {
  return {
    user: {
      permissions: resoudrePermissions(role, overrides),
    },
  }
}

// ──────────────────────────────────────────────
// 1. peutAcceder — cas de base
// ──────────────────────────────────────────────

describe('peutAcceder — cas de base', () => {
  it('retourne false si la session est null', () => {
    expect(peutAcceder(null, 'tableau_journalier')).toBe(false)
  })

  it('retourne false si la session est null avec une feature', () => {
    expect(peutAcceder(null, 'dossiers', 'voir')).toBe(false)
  })
})

// ──────────────────────────────────────────────
// 2. Rôle ACCUEIL
// ──────────────────────────────────────────────

describe('Rôle ACCUEIL', () => {
  const s = session('ACCUEIL')

  describe('Tableau journalier', () => {
    it('peut créer une visite', () => {
      expect(peutAcceder(s, 'tableau_journalier', 'creer_visite')).toBe(true)
    })

    it('peut modifier une visite', () => {
      expect(peutAcceder(s, 'tableau_journalier', 'modifier_visite')).toBe(true)
    })

    it('peut supprimer une visite', () => {
      expect(peutAcceder(s, 'tableau_journalier', 'supprimer_visite')).toBe(true)
    })

    it('peut exporter les visites', () => {
      expect(peutAcceder(s, 'tableau_journalier', 'exporter')).toBe(true)
    })

    it('ne peut pas importer les visites', () => {
      expect(peutAcceder(s, 'tableau_journalier', 'importer')).toBe(false)
    })
  })

  describe('Dossiers individuels', () => {
    it('peut voir les dossiers', () => {
      expect(peutAcceder(s, 'dossiers', 'voir')).toBe(true)
    })

    it('peut créer un dossier', () => {
      expect(peutAcceder(s, 'dossiers', 'creer')).toBe(true)
    })

    it('peut modifier un dossier', () => {
      expect(peutAcceder(s, 'dossiers', 'modifier')).toBe(true)
    })

    it('peut supprimer un dossier auto-généré', () => {
      expect(peutAcceder(s, 'dossiers', 'supprimer_auto')).toBe(true)
    })

    it('ne peut pas supprimer un vrai dossier', () => {
      expect(peutAcceder(s, 'dossiers', 'supprimer')).toBe(false)
    })

    it('ne peut pas supprimer un dossier avec accompagnement', () => {
      expect(peutAcceder(s, 'dossiers', 'supprimer_avec_accompagnement')).toBe(false)
    })

    it('ne peut pas exporter les dossiers', () => {
      expect(peutAcceder(s, 'dossiers', 'exporter')).toBe(false)
    })
  })

  describe('Accompagnements', () => {
    it('n\'a pas accès au module accompagnements', () => {
      expect(peutAcceder(s, 'accompagnements')).toBe(false)
    })

    it('ne peut pas voir les accompagnements', () => {
      expect(peutAcceder(s, 'accompagnements', 'voir')).toBe(false)
    })

    it('ne peut pas créer/modifier un accompagnement', () => {
      expect(peutAcceder(s, 'accompagnements', 'creer_modifier')).toBe(false)
    })
  })

  describe('Ateliers', () => {
    it('a accès au module ateliers (au moins une feature)', () => {
      expect(peutAcceder(s, 'ateliers')).toBe(true)
    })

    it('peut voir les ateliers', () => {
      expect(peutAcceder(s, 'ateliers', 'voir')).toBe(true)
    })

    it('ne peut pas créer/modifier un atelier', () => {
      expect(peutAcceder(s, 'ateliers', 'creer_modifier')).toBe(false)
    })

    it('ne peut pas supprimer un atelier', () => {
      expect(peutAcceder(s, 'ateliers', 'supprimer')).toBe(false)
    })

    it('peut ajouter une séance', () => {
      expect(peutAcceder(s, 'ateliers', 'ajouter_seance')).toBe(true)
    })
  })

  describe('Modules interdits', () => {
    it('n\'a pas accès aux bilans', () => {
      expect(peutAcceder(s, 'bilans')).toBe(false)
    })

    it('n\'a pas accès à la gestion des utilisateurs', () => {
      expect(peutAcceder(s, 'utilisateurs')).toBe(false)
    })

    it('n\'a pas accès aux archives', () => {
      expect(peutAcceder(s, 'archives')).toBe(false)
    })

    it('n\'a pas accès à l\'audit', () => {
      expect(peutAcceder(s, 'audit')).toBe(false)
    })
  })
})

// ──────────────────────────────────────────────
// 3. Rôle TRAVAILLEUR_SOCIAL
// ──────────────────────────────────────────────

describe('Rôle TRAVAILLEUR_SOCIAL', () => {
  const s = session('TRAVAILLEUR_SOCIAL')

  describe('Tableau journalier', () => {
    it('peut créer, modifier, supprimer des visites', () => {
      expect(peutAcceder(s, 'tableau_journalier', 'creer_visite')).toBe(true)
      expect(peutAcceder(s, 'tableau_journalier', 'modifier_visite')).toBe(true)
      expect(peutAcceder(s, 'tableau_journalier', 'supprimer_visite')).toBe(true)
    })
  })

  describe('Dossiers individuels', () => {
    it('peut voir, créer, modifier les dossiers', () => {
      expect(peutAcceder(s, 'dossiers', 'voir')).toBe(true)
      expect(peutAcceder(s, 'dossiers', 'creer')).toBe(true)
      expect(peutAcceder(s, 'dossiers', 'modifier')).toBe(true)
    })

    it('peut supprimer les dossiers (auto-générés et normaux)', () => {
      expect(peutAcceder(s, 'dossiers', 'supprimer_auto')).toBe(true)
      expect(peutAcceder(s, 'dossiers', 'supprimer')).toBe(true)
    })

    it('ne peut pas supprimer un dossier avec accompagnement', () => {
      expect(peutAcceder(s, 'dossiers', 'supprimer_avec_accompagnement')).toBe(false)
    })

    it('peut exporter les dossiers', () => {
      expect(peutAcceder(s, 'dossiers', 'exporter')).toBe(true)
    })
  })

  describe('Accompagnements', () => {
    it('a accès au module accompagnements', () => {
      expect(peutAcceder(s, 'accompagnements')).toBe(true)
    })

    it('peut voir les accompagnements', () => {
      expect(peutAcceder(s, 'accompagnements', 'voir')).toBe(true)
    })

    it('peut créer/modifier un accompagnement', () => {
      expect(peutAcceder(s, 'accompagnements', 'creer_modifier')).toBe(true)
    })

    it('ne peut pas supprimer un accompagnement', () => {
      expect(peutAcceder(s, 'accompagnements', 'supprimer')).toBe(false)
    })
  })

  describe('Ateliers', () => {
    it('peut voir, créer/modifier, supprimer les ateliers', () => {
      expect(peutAcceder(s, 'ateliers', 'voir')).toBe(true)
      expect(peutAcceder(s, 'ateliers', 'creer_modifier')).toBe(true)
      expect(peutAcceder(s, 'ateliers', 'supprimer')).toBe(true)
    })

    it('peut gérer les participants', () => {
      expect(peutAcceder(s, 'ateliers', 'gerer_participants')).toBe(true)
    })
  })

  describe('Bilans', () => {
    it('peut voir et exporter les bilans', () => {
      expect(peutAcceder(s, 'bilans', 'voir')).toBe(true)
      expect(peutAcceder(s, 'bilans', 'exporter')).toBe(true)
    })
  })

  describe('Modules interdits', () => {
    it('n\'a pas accès à la gestion des utilisateurs', () => {
      expect(peutAcceder(s, 'utilisateurs')).toBe(false)
    })

    it('n\'a pas accès aux archives', () => {
      expect(peutAcceder(s, 'archives')).toBe(false)
    })

    it('n\'a pas accès à l\'audit', () => {
      expect(peutAcceder(s, 'audit')).toBe(false)
    })
  })
})

// ──────────────────────────────────────────────
// 4. Rôle DIRECTION
// ──────────────────────────────────────────────

describe('Rôle DIRECTION', () => {
  const s = session('DIRECTION')

  describe('Accompagnements', () => {
    it('peut voir les accompagnements', () => {
      expect(peutAcceder(s, 'accompagnements', 'voir')).toBe(true)
    })

    it('peut créer/modifier un accompagnement', () => {
      expect(peutAcceder(s, 'accompagnements', 'creer_modifier')).toBe(true)
    })

    it('ne peut pas supprimer un accompagnement', () => {
      expect(peutAcceder(s, 'accompagnements', 'supprimer')).toBe(false)
    })
  })

  describe('Ateliers', () => {
    it('peut voir les ateliers', () => {
      expect(peutAcceder(s, 'ateliers', 'voir')).toBe(true)
    })

    it('peut créer/modifier un atelier', () => {
      expect(peutAcceder(s, 'ateliers', 'creer_modifier')).toBe(true)
    })
  })

  describe('Bilans', () => {
    it('peut voir et exporter les bilans', () => {
      expect(peutAcceder(s, 'bilans', 'voir')).toBe(true)
      expect(peutAcceder(s, 'bilans', 'exporter')).toBe(true)
    })
  })

  describe('Modules interdits', () => {
    it('n\'a pas accès à la gestion des utilisateurs', () => {
      expect(peutAcceder(s, 'utilisateurs')).toBe(false)
    })

    it('n\'a pas accès aux archives', () => {
      expect(peutAcceder(s, 'archives')).toBe(false)
    })

    it('n\'a pas accès à l\'audit', () => {
      expect(peutAcceder(s, 'audit')).toBe(false)
    })
  })
})

// ──────────────────────────────────────────────
// 5. Rôle ADMIN
// ──────────────────────────────────────────────

describe('Rôle ADMIN', () => {
  const s = session('ADMIN')

  it('a accès à tous les modules', () => {
    for (const mod of Object.keys(MODULES) as (keyof typeof MODULES)[]) {
      expect(peutAcceder(s, mod)).toBe(true)
    }
  })

  it('a toutes les features de chaque module', () => {
    for (const [mod, features] of Object.entries(MODULES) as [keyof typeof MODULES, readonly string[]][]) {
      for (const feat of features) {
        expect(peutAcceder(s, mod, feat)).toBe(true)
      }
    }
  })

  describe('Permissions spécifiques admin', () => {
    it('peut gérer les utilisateurs', () => {
      expect(peutAcceder(s, 'utilisateurs', 'gerer')).toBe(true)
    })

    it('peut voir et restaurer les archives', () => {
      expect(peutAcceder(s, 'archives', 'voir')).toBe(true)
      expect(peutAcceder(s, 'archives', 'restaurer')).toBe(true)
    })

    it('peut purger les archives', () => {
      expect(peutAcceder(s, 'archives', 'purger')).toBe(true)
    })

    it('peut consulter l\'audit', () => {
      expect(peutAcceder(s, 'audit', 'consulter')).toBe(true)
    })

    it('peut supprimer un dossier avec accompagnement', () => {
      expect(peutAcceder(s, 'dossiers', 'supprimer_avec_accompagnement')).toBe(true)
    })

    it('peut supprimer un accompagnement', () => {
      expect(peutAcceder(s, 'accompagnements', 'supprimer')).toBe(true)
    })
  })
})

// ──────────────────────────────────────────────
// 6. resoudrePermissions — overrides
// ──────────────────────────────────────────────

describe('resoudrePermissions — overrides', () => {
  it('retourne les défauts si overrides est null', () => {
    const perms = resoudrePermissions('ACCUEIL', null)
    expect(perms).toEqual(PERMISSIONS_PAR_DEFAUT['ACCUEIL'])
  })

  it('retourne les défauts si overrides est undefined', () => {
    const perms = resoudrePermissions('ACCUEIL')
    expect(perms).toEqual(PERMISSIONS_PAR_DEFAUT['ACCUEIL'])
  })

  it('peut activer une feature désactivée par défaut', () => {
    const perms = resoudrePermissions('ACCUEIL', {
      accompagnements: { voir: true },
    })
    const s = { user: { permissions: perms } }
    expect(peutAcceder(s, 'accompagnements', 'voir')).toBe(true)
  })

  it('peut désactiver une feature activée par défaut', () => {
    const perms = resoudrePermissions('TRAVAILLEUR_SOCIAL', {
      dossiers: { supprimer: false },
    })
    const s = { user: { permissions: perms } }
    expect(peutAcceder(s, 'dossiers', 'supprimer')).toBe(false)
    // Les autres features du module ne sont pas affectées
    expect(peutAcceder(s, 'dossiers', 'voir')).toBe(true)
  })

  it('ignore les features inconnues dans les overrides', () => {
    const perms = resoudrePermissions('ACCUEIL', {
      dossiers: { feature_inconnue: true } as Record<string, boolean>,
    })
    // Ne plante pas, les défauts sont préservés
    expect(perms.dossiers).toBeDefined()
  })

  it('ignore les modules inconnus dans les overrides', () => {
    const perms = resoudrePermissions('ACCUEIL', {
      module_inconnu: { voir: true },
    } as Record<string, Record<string, boolean>>)
    // Ne plante pas
    expect(perms).toBeDefined()
  })
})

// ──────────────────────────────────────────────
// 7. peutAcceder — accès au module (sans feature)
// ──────────────────────────────────────────────

describe('peutAcceder — accès module (sans feature)', () => {
  it('retourne true si au moins une feature est activée', () => {
    const s = session('ACCUEIL')
    // ACCUEIL a au moins 'voir' dans dossiers
    expect(peutAcceder(s, 'dossiers')).toBe(true)
  })

  it('retourne false si aucune feature n\'est activée', () => {
    const s = session('ACCUEIL')
    // ACCUEIL n'a aucune feature dans accompagnements
    expect(peutAcceder(s, 'accompagnements')).toBe(false)
  })
})
