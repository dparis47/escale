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
- **ASID** — lié au Conseil Départemental
  - Prescripteur = toujours un CMS (nom prénom + ville du CMS)
  - Contient des `EntretienASID` (date + sujets) ET des `DemarcheASID` (jalons/résultats)
- **FSE** — mis de côté (informations manquantes)

### Partenaires statistiques (bilans sur données de visites)
- **France Travail** — données des visites + contrats de travail trouvés
- **CPAM / ARS** — suivi santé détaillé (`ServiceSante`) par visite, anonyme possible
- **Conseil Départemental** — données démographiques + ateliers

### Entités clés
- **Person** — fiche personne. Champs : orientePar (qui l'a envoyée à l'Escale), accoGlo (boolean — est en accompagnement global FT, non géré par l'Escale)
- **Visit** — tableau journalier. Une ligne par personne par jour. Anonyme possible (genre + motifs sans fiche)
- **ServiceSante** — suivi santé pour CPAM/ARS. Une entrée par visite. Anonyme possible. Booléens par sujet (CSS, carte vitale, AMELI, MDPH, orientations...)
- **ContratDeTravail** — historique des contrats liés à une personne (type CDI/CDD/CDDI/Intérim, dates, employeur, ville, poste). Plusieurs contrats possibles par personne
- **ActionCollective** — ateliers collectifs. Participants toujours liés à une fiche personne (pas d'anonyme)
- **AccompagnementASID** — suivi ASID avec EntretienASID (date + sujets) et DemarcheASID (jalons)

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

### Étape 2 — Base de données (local SQLite)
- [ ] Installer Prisma
- [ ] Écrire le schéma complet (Person, Visit, ASID, Atelier…)
- [ ] Générer et appliquer les migrations
- [ ] Créer les données de test (seed)

### Étape 3 — Authentification
- [ ] Installer NextAuth.js
- [ ] Configurer les 3 rôles
- [ ] Page `/login`
- [ ] Protection des routes par rôle

### Étape 4 — Tableau journalier
- [ ] Page principale `/`
- [ ] Saisie des visites du jour
- [ ] Recherche de personne par nom (autocomplete)
- [ ] Visites anonymes (sans fiche)

### Étape 5 — Fiches personnes
- [ ] Page `/personnes` (liste + recherche)
- [ ] Page `/personnes/[id]` (lecture)
- [ ] Page `/personnes/nouvelle` (création)
- [ ] Modification fiche (rôle Travailleur social)

### Étape 6 — Accompagnement ASID
- [ ] Page `/asid` (liste)
- [ ] Page `/asid/[id]` (fiche + démarches)

### Étape 7 — Actions collectives
- [ ] Page `/ateliers`
- [ ] Fiche atelier + liste participants

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
