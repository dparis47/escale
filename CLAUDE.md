# CLAUDE.md — Application L'Escale

## Contexte du projet

Application web de gestion pour l'association **L'Escale**, un lieu d'accueil libre où toute personne peut venir faire ses démarches (emploi, administratif, numérique…) sans rendez-vous.

- 800 à 1 000 personnes accueillies par an
- Plusieurs postes dans l'association (accès multi-navigateurs)
- Pas de ressources techniques pour gérer un serveur

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js (React + TypeScript) |
| Base de données DEV | PostgreSQL local |
| Base de données PROD | PostgreSQL via Supabase |
| ORM | Prisma |
| Authentification | NextAuth.js |
| Hébergement | Vercel |
| UI | Tailwind CSS + shadcn/ui |
| Tests unitaires | Vitest |
| Tests e2e | Playwright |

## Documentation de la base de données

Le fichier `docs/base-de-donnees.md` documente toutes les tables et leurs champs.
**Règle : toute modification de `prisma/schema.prisma` doit être répercutée immédiatement dans `docs/base-de-donnees.md`.**

## Règles de développement

- **Soft delete obligatoire** sur toutes les entités : champ `deletedAt DateTime?` — `null` = actif, date = supprimé. Jamais de `DELETE` physique.
- TypeScript strict — `any` interdit
- ESLint + Prettier obligatoires
- Validation serveur avec Zod
- Vérification du rôle à chaque appel API
- Jamais de secrets dans le code (variables d'environnement)
- Tests écrits en même temps que le code (couverture > 80%)
- Commits en français, une branche par fonctionnalité
- Pas de commit direct sur `main`
- Interface entièrement en français

## Rôles utilisateurs

| Rôle | Description |
|---|---|
| `ACCUEIL` | Saisit le tableau journalier, crée et met à jour les fiches personnes |
| `TRAVAILLEUR_SOCIAL` | Gère les fiches personnes, accompagnements, bilans |
| `DIRECTION` | Consulte et génère les bilans |

## Modèle de données — décisions d'architecture

### Accompagnements formels (suivi structuré)
- **FSE** — accompagnement formel, plusieurs possibles par personne
  - Ressources saisies = situation à l'entrée dans le FSE (pas les ressources actuelles de la fiche)
  - Contient : dates entrée/sortie, RSA pendant FSE, ressources à l'entrée,
    situation avant FSE (emploi), démarches effectuées (booléens), situation de sortie,
    formation si sortie=formation (intitulé, organisme, ville, durée), observations
  - Bilan = liste nominative + totaux par colonne
  - Lien optionnel vers AccompagnementASID
- **ASID** — toujours lié à un FSE (ASID ⊂ FSE). Créer un ASID = créer automatiquement le FSE correspondant
  - Prescripteur = toujours un CMS (nom prénom + ville du CMS)
  - Contient des `EntretienASID` (date + sujets) ET des `DemarcheASID` (jalons/résultats)

### Partenaires statistiques (bilans sur données de visites)
- **France Travail** — données des visites + contrats de travail trouvés
- **CPAM / ARS** — suivi santé détaillé (`ServiceSante`) par visite, anonyme possible
- **Conseil Départemental** — données démographiques + ateliers

### Entités clés
- **Person** — fiche personne. Champs : orientePar (qui l'a envoyée à l'Escale), accoGlo (boolean — est en accompagnement global FT, non géré par l'Escale)
- **Visit** — tableau journalier. Une ligne par personne par jour. "Sans fiche" possible : genre + motifs sans fiche Person, avec nom/prénom libres optionnels. Champs : motifs[], orienteParFT, autreMotif, nomAtelier, commentaire, carteSolidaire (Mobilité), consultationOffres + candidatures + projetProfessionnel (Emploi). Audit trail : saisieParId + modifieParId.
- **ServiceSante** — suivi santé pour CPAM/ARS. Une entrée par visite (relation @unique). Anonyme possible. Booléens par sujet : ouverture droits (CSS, carte vitale, affiliation, AME…), accès numérique Ameli, démarches CPAM, accès soins (MDPH, bilan…), orientations partenaires, santeMentale, soutienPsychologique. S'affiche dans le formulaire visite quand "Santé" est coché (arbre récursif expand/collapse).
- **ContratDeTravail** — historique des contrats liés à une personne (type CDI/CDD/CDDI/Intérim, dates, employeur, ville, poste). Plusieurs contrats possibles par personne
- **ActionCollective** — ateliers collectifs. Participants toujours liés à une fiche personne (pas d'anonyme)
- **AccompagnementASID** — suivi ASID avec EntretienASID (date + sujets) et DemarcheASID (jalons)
- **AccompagnementFSE** — suivi FSE avec ressources à l'entrée, démarches (booléens), situation avant/après

### Distinctions importantes
- `orientePar` (fiche personne) ≠ `prescripteur` (ASID uniquement)
- France Travail = prescripteur possible pour visites générales, JAMAIS pour ASID
- CPAM et ARS = partenaires statistiques uniquement, pas d'accompagnement formel

---

## Plan de développement

### Étape 1 — Initialisation ✅
- [x] Créer le projet Next.js + TypeScript
- [x] Configurer ESLint, Prettier
- [x] Installer et configurer Tailwind CSS
- [x] Installer et configurer shadcn/ui

### Étape 2 — Base de données (PostgreSQL local) ✅
- [x] Installer Prisma
- [x] Écrire le schéma complet (Person, Visit, FSE, ASID, Atelier…)
- [x] Générer et appliquer les migrations
- [x] Créer les données de test (seed)

### Étape 3 — Authentification ✅
- [x] Installer NextAuth.js v5 + Zod + bcryptjs
- [x] Configurer les 3 rôles (ACCUEIL, TRAVAILLEUR_SOCIAL, DIRECTION)
- [x] Page `/login` (formulaire shadcn/ui, messages d'erreur en français)
- [x] Protection des routes par middleware (src/middleware.ts)
- [x] Tests validés manuellement :
  - Accès à `/` sans session → redirigé vers `/login`
  - Mauvais mot de passe → message d'erreur affiché
  - Connexion `accueil@escale.fr` / `password123` → redirigé vers `/`
  - Accès à `/login` connecté → redirigé vers `/`
  - Rafraîchissement → session maintenue

### Étape 4 — Tableau journalier ✅
- [x] Page principale `/` avec navigation entre les jours (J / J-1…), indicateurs mensuels et annuels
- [x] Formulaire de saisie en 2 étapes (type → formulaire), création et modification
- [x] Recherche de personne par nom (autocomplete, debounce 300 ms)
- [x] Visites "sans fiche" (nom/prénom libres optionnels)
- [x] Motifs avec progressive disclosure : Santé → arbre ServiceSante, Mobilité → Carte solidaire, Emploi → Recherche (offres/candidatures) + Projet professionnel
- [x] Soft delete des visites (bouton Supprimer)
- [x] Audit trail discret (ⓘ tooltip : saisi par / modifié par)

### Étape 5 — Fiches personnes ✅
- [x] Page `/personnes` (liste + recherche + pagination, tous les rôles)
- [x] Page `/personnes/[id]` (lecture, tous les rôles)
- [x] Page `/personnes/nouvelle` (création, tous les rôles)
- [x] Page `/personnes/[id]/modifier` (modification, tous les rôles sauf DIRECTION)
- [x] Suppression (soft delete) depuis la liste et la fiche
- [x] Formulaire 6 sections : Identité, Contact, Santé (CSS/RQTH/Invalidité/N°sécu), France Travail, Situation familiale & mobilité (hébergement dropdown), Ressources & orientation
- [x] Âges des enfants : champs dynamiques +/−
- [x] Boutons de navigation dans le header (Tableau journalier / Fiches personnes)
- [x] Migration `20260227190421_ajout_numero_secu` (ajout champ `numeroSecu` sur Person)

### Étape 6 — Accompagnement ASID ✅
- [x] Page `/asid` (liste, TS + DIRECTION, recherche par nom, pagination)
- [x] Page `/asid/nouveau` (création, TS seulement) — crée atomiquement FSE + ASID + DemarcheASID
- [x] Page `/asid/[id]` (fiche détail, TS seulement) — indicateurs, ressources FSE, entretiens inline, démarches
- [x] Page `/asid/[id]/modifier` (modification, TS seulement)
- [x] Entretiens : ajout/suppression inline (date, sujets SujetEntretienASID enum, notes)
- [x] Démarches ASID : 6 sections (Santé, Mobilité, Logement, Emploi, Atelier, Parentalité)
- [x] Lien "ASID" dans le header (TS + DIRECTION uniquement)
- [x] Prescripteur = CMS (nom + prénom + ville), référent = sélection parmi les utilisateurs

### Étape 7 — Actions collectives ✅
- [x] Page `/ateliers` (liste + recherche + pagination, TS + DIRECTION)
- [x] Page `/ateliers/nouveau` (création, TS seulement)
- [x] Page `/ateliers/[id]` (détail + participants, TS + DIRECTION)
- [x] Page `/ateliers/[id]/modifier` (édition, TS seulement)
- [x] `SectionParticipants` — ajout inline autocomplete + soft delete
- [x] Lien "Ateliers" dans le header (TS + DIRECTION)

### Étape 8 — Bilans partenaires
- [ ] Page `/bilans`
- [ ] Bilan France Travail
- [ ] Bilan CPAM / ARS
- [ ] Bilan Conseil Départemental

### Étape 9 — Tests
- [ ] Tests unitaires Vitest (règles métier, API routes)
- [ ] Tests e2e Playwright (parcours utilisateur)

### Étape 10 — Migration vers Supabase
- [ ] Changer la connexion Prisma vers PostgreSQL Supabase
- [ ] Déploiement sur Vercel

## Pages de l'application

| Page | Rôles | Description |
|---|---|---|
| `/login` | Tous | Connexion |
| `/` | Accueil, TS | Tableau journalier |
| `/personnes` | Tous | Liste + recherche |
| `/personnes/[id]` | Tous | Fiche personne |
| `/personnes/nouvelle` | TS | Création fiche |
| `/asid` | TS, Direction | Liste ASID |
| `/asid/[id]` | TS | Fiche ASID |
| `/ateliers` | TS, Direction | Actions collectives |
| `/bilans` | TS, Direction | Bilans partenaires |

## Structure du projet (cible)

```
src/
  app/                  # Routes Next.js (App Router)
  components/           # Composants React réutilisables
  lib/                  # Utilitaires (prisma client, auth, etc.)
  types/                # Types TypeScript métier
  schemas/              # Schémas Zod (validation)
prisma/
  schema.prisma
  seed.ts
  migrations/
```
