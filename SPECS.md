# Spécifications — Application L'Escale

## Contexte

L'association L'Escale est un **lieu d'accueil libre** où toute personne peut venir librement faire ses démarches (recherche d'emploi, administratif, numérique, etc.) sans rendez-vous.

- Entre 800 et 1 000 personnes accueillies par an
- Le nombre de visites par jour est variable, de l'ordre de la dizaine
- **Toutes les personnes ne sont pas dans un accompagnement formel** : beaucoup viennent simplement utiliser les services de l'association
- Certaines personnes sont en **accompagnement structuré** dans le cadre de conventions avec des partenaires (Conseil Départemental / ASID, France Travail, CPAM/ARS, FSE…)

### Bilans partenaires

Les bilans demandés par les partenaires sont des **données agrégées**. Ils sont généralement **annuels**, mais des bilans **intermédiaires** peuvent être nécessaires en cours d'année. L'application doit permettre de générer un bilan sur une période donnée.

---

## Fiche personne

Une fiche n'est pas systématiquement créée pour chaque personne. Elle est créée dans deux cas :

1. **Suivi institutionnel** (ASID, France Travail, CPAM/ARS…) : la fiche est obligatoire
2. **Accueil libre** : la fiche est créée si la personne revient régulièrement et effectue des démarches (emploi, santé, ateliers, etc.)

Les passages ponctuels sans fiche sont enregistrés comme visites anonymes dans le tableau journalier.

| Champ | Type / Valeurs |
|---|---|
| Nom | Texte |
| Prénom | Texte |
| Sexe | Homme, Femme |
| Nationalité | Texte |
| Adresse | Texte |
| Téléphone | Texte |
| Mobile | Texte |
| Email | Texte |
| Date d'actualisation | Date (dernière mise à jour de la fiche) |
| CSS | Oui / Non |
| RQTH | Oui / Non |
| Invalidité | Oui / Non |
| — Catégorie invalidité | Texte |
| N° France Travail | Texte |
| — Date d'inscription France Travail | Date |
| — CP (code personnel) | Texte |
| N° CAF | Texte |
| Situation familiale | Marié(e), Célibataire, Divorcé(e), Séparé(e), Concubinage, Veuf(ve) |
| Nombre d'enfants à charge | Nombre |
| — Âge(s) des enfants | Liste de nombres |
| Permis de conduire | Oui / Non |
| Véhicule personnel | Oui / Non |
| Autre(s) moyen(s) de locomotion | Texte |
| Hébergement | Texte |
| Ressources | ARE, ASS, RSA, AAH, Invalidité, IJ, ASI, Salaire, Conjoint, Sans ressource |
| Orienté par | France Travail, CMS, Mairie, Connaissance, CMPA, Maison des Familles |

---

## Suivi des visites (tableau journalier)

Chaque jour, la personne à l'accueil remplit un tableau de suivi des visites. Un commentaire libre peut être ajouté par visite.

**Règles métier :**
- Une personne = **une seule ligne par jour**, quel que soit le nombre de passages dans la journée. Les motifs de tous ses passages sont regroupés sur cette ligne.
- Une visite peut être enregistrée **sans fiche personne** (passage anonyme, personne de passage qui ne reviendra pas). Dans ce cas, seuls le genre, les motifs et le commentaire sont saisis. Ces visites sont tout de même comptabilisées dans les statistiques.
- Le compteur "Visites" correspond au nombre total de jours où la personne est venue (une fois par jour).

### Colonnes du tableau

| Champ | Type / Valeurs |
|---|---|
| Date | Date du jour |
| Genre | Homme, Femme |
| Nom | Texte |
| Prénom | Texte |
| Visites | Nombre (compteur de visites de la personne) |
| Motif(s) | MSA/CAF, Santé, PASS, Logement, Mobilité, CV/LM, Emploi, Recherches/Admin, Inscription/Réinscription France Travail, Création compte France Travail, Accompagnement numérique, Internet, Info(s)/Conseil(s), Lien social, Ateliers, Cours d'informatique, ASID |
| Orienté(e) par France Travail | Oui / Non |
| Commentaire | Texte libre |

---

## Bilan France Travail

Données collectées pour le bilan à fournir à France Travail (partenaire). Ces indicateurs sont calculés à partir des visites et accompagnements enregistrés.

| Indicateur | Description |
|---|---|
| Orienté par France Travail | Nombre de personnes orientées par France Travail |
| Inscrit à France Travail | Nombre de personnes inscrites à France Travail |
| CV et/ou LM | Nombre de personnes venues faire leur CV et/ou lettre de motivation |
| Recherche — Consultation des offres | Nombre de personnes ayant consulté des offres |
| Recherche — Candidatures faites à l'Escale | Nombre de personnes ayant fait des candidatures |
| Échanges administratifs avec France Travail | Nombre de personnes ayant eu des échanges administratifs |
| Accompagnement numérique | Nombre de personnes accompagnées numériquement |
| Inscription faite à l'Escale | Nombre d'inscriptions réalisées à l'Escale |
| Ateliers collectifs | Nombre de personnes participant aux ateliers |
| Cours d'informatique | Nombre de personnes participant aux cours d'informatique |
| Droits (ouverture ou maintien) | Nombre de personnes ayant fait des démarches de droits |
| Élaboration de projet professionnel | Nombre de personnes en élaboration de projet |
| ASID | Nombre de personnes en accompagnement ASID |
| ACCO Glo (accompagnement global France Travail) | Nombre de personnes en accompagnement global |
| Contrat de travail trouvé | Nombre de personnes ayant trouvé un emploi |
| — Type de contrat | CDI, CDD, CDDI, Intérim |
| — Date de début | Date |
| — Date de fin | Date |
| — Employeur (ville et poste) | Texte |
| — Poste occupé | Texte |

---

## Actions collectives

En plus du suivi individuel, l'association organise des actions collectives.

### Fiche action collective

| Champ | Type / Valeurs |
|---|---|
| Thème | Cours d'informatique, Cinéma, Socio-esthétique, Randonnée, Sport, Piscine, Budget, Santé/environnement, Cuisine, Cuisine anti-gaspi, Médiation équine, Atelier créatif, Culturel (jeux de société, visite, projet culturel itinérant…), Noël, Projet cinéma… |
| Prestataire | Au fil des Sesounes, La cuisine d'Hélo, Diététicienne… (liste extensible) |
| Lieu | Café culturel 109, L'Escale, Piscine, Le Studio, Équisi… (liste extensible) |
| Date | Date |
| Liste des participants | Lien vers les personnes de la base |

### Statistiques actions collectives

| Indicateur | Description |
|---|---|
| Nombre d'ateliers dans l'année | Par thème |
| Nombre de participants | Personnes uniques |
| Nombre de participations | Total des présences (une même personne peut participer plusieurs fois) |

---

## Bilan CPAM / ARS

La CPAM et l'ARS sont deux partenaires demandant des informations sur les actions menées avec les personnes.

Actuellement, les salariés remplissent un tableau Excel : chaque ligne correspond à une personne venue, et ils saisissent **1** pour chaque objet de visite applicable. Certaines colonnes sont déclinées en sous-catégories pour affiner l'information.

### Ouverture et maintien des droits
- Dossier CSS
- Carte Vitale
- Affiliation
  - Droits santé
  - Mutuelle
- Invalidité
- Rattachement enfants
- AME

### Accès au numérique
- Création compte AMELI/MSA
- Consultation et démarches sur les espaces personnels AMELI/MSA

### Démarches administratives
- Échange avec CPAM/MSA
- Impression et/ou envoi de documents
- Information sur les droits

### Accès aux soins et suivi du parcours santé
- Démarches d'accès aux soins
- Dossier MDPH
- Suivi de parcours de soin
- Bilan de santé *(compte également dans "Orientations partenaires / autres partenaires" car c'est l'Escale qui accompagne)*

### Orientations partenaires
- CPAM/MSA
  - CRAMIF
  - Santé au travail
- MDPH
- Orientation et permanences PASS
- Autres partenaires *(sous-domaine interne à l'Escale)*
  - Addictologie
  - Maison des femmes
  - GEM/CMPA
  - Médecins et centres de soins
  - Centre de dépistage

### Santé mentale et soutien psychologique

### Indicateurs ARS — Entretiens individuels

L'ARS demande en plus le suivi des entretiens individuels. Pour chaque personne reçue :

| Indicateur | Description |
|---|---|
| Nombre d'entretiens total | Nombre total d'entretiens réalisés avec la personne |
| Nombre d'entretiens par sujet | Nombre de fois que chaque sujet (colonnes et sous-catégories ci-dessus) a été traité sur l'ensemble des entretiens de la personne |

> Ces indicateurs permettent à l'ARS de connaître le nombre de personnes reçues en entretien individuel, ainsi que la volumétrie par thématique.

---

## Bilan Conseil Départemental

| Indicateur | Description |
|---|---|
| Personnes uniques reçues sur l'année | Dédoublonnage par personne |
| Nombre d'hommes / femmes | Répartition par genre |
| Suivi régulier | Nombre de personnes venues plusieurs fois |
| Suivi irrégulier | Nombre de personnes reçues de manière irrégulière |
| Ressources connues | Nombre de personnes dont les ressources sont renseignées |
| Ressources inconnues | Nombre de personnes dont les ressources ne sont pas renseignées |
| Bénéficiaires du RSA suivis | Nombre de personnes avec ressource RSA |

### Tranches d'âge

| Tranche | |
|---|---|
| Moins de 25 ans | |
| 25 – 29 ans | |
| 30 – 34 ans | |
| 35 – 39 ans | |
| 40 – 44 ans | |
| 45 – 49 ans | |
| 50 – 54 ans | |
| 55 – 60 ans | |
| Plus de 60 ans | |

### Ateliers (Conseil Départemental)

| Indicateur | Description |
|---|---|
| Nombre d'ateliers par thème | |
| Nombre de participants | Personnes uniques |
| Nombre d'allocataires du RSA participants | |

---

## Accompagnement ASID

L'ASID est un type d'accompagnement individuel suivi spécifiquement. Chaque personne en ASID a une fiche dédiée.

| Champ | Type / Valeurs |
|---|---|
| Genre | Homme, Femme |
| Âge | Nombre |
| Commune de résidence | Texte |
| Prescripteur | Nom + Prénom de la personne ayant prescrit le suivi |
| Référent | Nom + Prénom du salarié chargé de l'accompagnement social |
| Date d'entrée | Date |
| Date de renouvellement | Date |
| Date de sortie | Date |
| Orientation N-1 | Booléen — l'orientation pour le suivi ASID a été faite l'année précédente |
| Orientation N | Booléen — l'orientation a été faite durant l'année en cours |
| Renouvellement N | Booléen — le suivi a été renouvelé durant l'année en cours |
| Suivi N-2 en cours | Booléen — le suivi se poursuit depuis l'année N-2 |
| Suivi réalisé | Booléen — la personne adhère au suivi (les abandons peuvent avoir plusieurs motifs : absences répétées aux rendez-vous, etc.) |
| Observation | Texte libre |

### Démarches ASID

Les démarches effectuées par la personne tout au long de son suivi ASID sont tracées :

**Santé**
- CSS
- Suivi santé
- Bilan de santé
- Soutien psy

**Mobilité**
- Permis de conduire : Oui / Non
- Véhicule disponible
- Inscription auto-école
  - Code
  - Conduite
- État du véhicule : Bon / Mauvais
- BDI
  - Voiture
  - Permis
- Carte solidaire

**Logement**
- Habitat indigne
- Déménagement ou accès logement

**Emploi**
- Recherche d'emploi
- CV et/ou lettre de motivation
- Offres d'emploi proposées
- Entretiens
- Contrat de travail
  - CDI
  - CDD
  - IAE
  - Lieu
- Projet professionnel et/ou de formation
- Immersion

**Atelier de redynamisation**

**Parentalité**
- Enfants
- Mode de garde
- Partenaires
  - Maison des familles
  - Maison 1000 bulles
  - PMI
  - Mission locale

---

## Gestion des utilisateurs et rôles

L'application comporte 3 profils utilisateurs :

| Rôle | Description |
|---|---|
| **Accueil** | Saisit le tableau journalier des visites |
| **Travailleur social** | Gère les fiches personnes, les accompagnements, peut générer les bilans |
| **Direction** | Consulte et génère les bilans et bilans intermédiaires |

### Droits d'accès par fonctionnalité

| Fonctionnalité | Accueil | Travailleur social | Direction |
|---|---|---|---|
| Tableau journalier (saisie) | Oui | Oui | Non |
| Fiche personne (lecture) | Oui | Oui | Oui |
| Fiche personne (modification) | Non | Oui | Non |
| Accompagnement ASID — données | Non | Oui | Oui |
| Accompagnement ASID — démarches | Non | Oui | Non |
| Actions collectives | Non | Oui | Oui |
| Bilans partenaires (génération) | Non | Oui | Oui |

---

## Stack technique

### Choix et justifications

L'association n'a pas de ressources techniques pour gérer un serveur. La stack choisie doit être :
- Simple à déployer et maintenir
- Accessible depuis n'importe quel navigateur (plusieurs postes dans l'association)
- Hébergée sans gestion de serveur
- Gratuite ou peu coûteuse à l'échelle de l'association

| Couche | Technologie | Justification |
|---|---|---|
| Framework | **Next.js** (React + TypeScript) | Full-stack dans un seul projet, frontend et backend unifiés |
| Base de données | **PostgreSQL** via **Supabase** | Hébergé, géré, sauvegardes automatiques, gratuit pour ce volume |
| ORM | **Prisma** | Accès base de données typé, migrations simples |
| Authentification | **NextAuth.js** | Gestion des sessions et rôles intégrée |
| Hébergement app | **Vercel** | Déploiement automatique, gratuit, aucune gestion serveur |

### Architecture

```
Navigateur (accueil / travailleur social / direction)
        ↓ HTTPS
Application Next.js (Vercel)
        ↓
API Routes Next.js  ←→  NextAuth (sessions / rôles)
        ↓
Prisma ORM
        ↓
PostgreSQL (Supabase)
```

### Avantages pour l'association
- **Zéro serveur à gérer** : Vercel et Supabase s'occupent de tout
- **Accès multi-postes** : accessible depuis n'importe quel navigateur sur le réseau
- **Sauvegardes automatiques** : Supabase sauvegarde la base de données
- **Coût** : gratuit aux volumes de l'association (< 1 000 personnes, < 10 utilisateurs)
- **Sécurité** : HTTPS, authentification par rôle, données hébergées en Europe (Supabase EU)

---

## Interface utilisateur (UI)

### Bibliothèques

| Outil | Rôle |
|---|---|
| **Tailwind CSS** | Styles utilitaires, mise en page |
| **shadcn/ui** | Composants accessibles (boutons, formulaires, tableaux, modales…) |

**Pourquoi shadcn/ui ?**
- Les composants sont copiés dans le projet (pas de dépendance externe à gérer)
- Basé sur Radix UI (accessibilité ARIA native)
- Entièrement stylable avec Tailwind
- Parfait pour les formulaires complexes et les tableaux de données

### Pages principales

| Page | Rôle(s) | Description |
|---|---|---|
| `/login` | Tous | Page de connexion |
| `/` | Accueil, TS | Tableau journalier du jour |
| `/personnes` | Accueil, TS, Direction | Recherche et liste des personnes |
| `/personnes/[id]` | Accueil (lecture), TS | Fiche d'une personne |
| `/personnes/nouvelle` | TS | Création d'une fiche |
| `/asid` | TS, Direction | Liste des suivis ASID |
| `/asid/[id]` | TS | Fiche ASID d'une personne |
| `/ateliers` | TS, Direction | Actions collectives |
| `/bilans` | TS, Direction | Génération des bilans partenaires |

### Principes UX

- **Simplicité avant tout** : les utilisateurs ne sont pas des techniciens
- **Saisie rapide** : recherche de personne par nom avec autocomplete dans le tableau journalier
- **Langue française** dans toute l'interface
- **Responsive** : utilisable sur écran de bureau et tablette
- **Retours visuels clairs** : confirmation de sauvegarde, erreurs explicites, champs obligatoires visibles

---

## Règles de développement

### TypeScript
- **`any` est interdit** — utiliser des types précis, des `unknown` avec narrowing, ou des génériques
- `strict: true` activé dans `tsconfig.json` (inclut `noImplicitAny`, `strictNullChecks`, etc.)
- Pas de `@ts-ignore` sauf cas exceptionnel documenté
- Les types métier (Person, Visit, Role…) sont définis dans un dossier `types/` partagé

### Qualité du code
- **ESLint** avec règles strictes (`eslint-config-next` + règles custom)
- **Prettier** pour le formatage automatique
- Pas de code mort, pas de `console.log` en production
- Les fonctions font une seule chose (principe de responsabilité unique)

### Tests
- **Vitest** pour les tests unitaires et d'intégration
- **Playwright** pour les tests end-to-end (parcours utilisateur)
- Couverture obligatoire sur :
  - Toutes les règles métier (calcul des visites, droits d'accès par rôle, agrégats des bilans)
  - Toutes les API routes
  - Les formulaires critiques (saisie visite, création fiche)
- Les tests sont écrits **en même temps que le code**, pas après
- Objectif de couverture : **> 80%**

### Sécurité
- Validation des entrées côté serveur avec **Zod** (jamais faire confiance au client)
- Vérification du rôle utilisateur à chaque appel API
- Pas de données sensibles dans les logs
- Variables d'environnement pour toutes les clés/secrets (jamais dans le code)

### Git
- Une branche par fonctionnalité (`feature/tableau-journalier`, `feature/fiche-personne`…)
- Messages de commit clairs et en français
- Pas de commit direct sur `main`

---

## À compléter

- Accompagnement FSE *(en attente d'informations)*
