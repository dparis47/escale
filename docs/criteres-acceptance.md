# Critères d'acceptance — Application L'Escale

> Basés sur les spécifications fonctionnelles, pas sur l'implémentation.
> Chaque critère peut devenir un ou plusieurs tests (unitaire ou e2e).

---

## 1. Authentification (`/login`)

### 1.1 Connexion
- [ ] Un utilisateur avec des identifiants valides peut se connecter
- [ ] Après connexion, l'utilisateur est redirigé vers `/`
- [ ] Un mauvais mot de passe affiche un message d'erreur en français
- [ ] Un email inexistant affiche un message d'erreur en français
- [ ] La session est maintenue après rafraîchissement de la page

### 1.2 Protection des routes
- [ ] Un utilisateur non connecté est redirigé vers `/login` sur toute page protégée
- [ ] Un utilisateur connecté qui accède à `/login` est redirigé vers `/`
- [ ] Chaque rôle ne peut accéder qu'aux pages autorisées :
  - ACCUEIL : `/`, `/personnes`, `/personnes/[id]`, `/personnes/nouvelle`, `/personnes/[id]/modifier`
  - TRAVAILLEUR_SOCIAL : toutes les pages sauf `/admin`
  - DIRECTION : `/`, `/personnes` (lecture seule), `/asid` (lecture seule), `/ateliers` (lecture seule), `/bilans`
  - ADMIN : pages d'administration uniquement

### 1.3 Vérification du rôle côté API
- [ ] Chaque route API vérifie le rôle de l'utilisateur
- [ ] Une requête API sans session retourne 401
- [ ] Une requête API avec un rôle insuffisant retourne 403

---

## 2. Tableau journalier (`/`)

### 2.1 Navigation entre les jours
- [ ] Par défaut, la page affiche le jour courant
- [ ] On peut naviguer vers J-1, J-2, etc.
- [ ] On peut revenir au jour courant
- [ ] Chaque jour affiche uniquement les visites de ce jour

### 2.2 Indicateurs
- [ ] Les indicateurs mensuels affichent les totaux du mois en cours
- [ ] Les indicateurs annuels affichent les totaux de l'année en cours
- [ ] Les compteurs reflètent uniquement les visites non supprimées

### 2.3 Création d'une visite avec fiche personne
- [ ] La recherche de personne fonctionne par nom (autocomplete)
- [ ] Le debounce de la recherche est de 300ms
- [ ] Sélectionner une personne pré-remplit ses informations
- [ ] La visite est enregistrée et apparaît dans le tableau du jour

### 2.4 Création d'une visite sans fiche ("anonyme")
- [ ] On peut créer une visite sans sélectionner de fiche personne existante
- [ ] Le genre est obligatoire pour une visite sans fiche
- [ ] Le nom et prénom sont optionnels en mode sans fiche
- [ ] Les motifs sont sélectionnables

### 2.5 Motifs et progressive disclosure
- [ ] Les motifs sont des cases à cocher multiples
- [ ] Cocher "Santé" affiche l'arbre détaillé ServiceSante
- [ ] Cocher "Mobilité" affiche le champ Carte solidaire
- [ ] Cocher "Emploi" affiche : Consultation offres, Candidatures, Projet professionnel
- [ ] Le champ "Autre motif" permet une saisie libre
- [ ] Le champ "Atelier" permet de saisir le nom de l'atelier

### 2.6 Champs additionnels
- [ ] "Orienté par France Travail" est un booléen
- [ ] Le commentaire est un champ texte libre
- [ ] La carte solidaire est liée au motif Mobilité

### 2.7 Modification d'une visite
- [ ] On peut modifier une visite existante du jour
- [ ] Les champs sont pré-remplis avec les valeurs actuelles
- [ ] La modification met à jour `modifieParId`

### 2.8 Suppression d'une visite
- [ ] Le bouton Supprimer effectue un soft delete (met `deletedAt` à la date courante)
- [ ] La visite supprimée n'apparaît plus dans le tableau
- [ ] La visite supprimée n'est plus comptée dans les indicateurs
- [ ] Aucun DELETE physique n'est effectué en base

### 2.9 Audit trail
- [ ] Chaque visite affiche discrètement (tooltip ⓘ) qui l'a saisie
- [ ] Si modifiée, le tooltip affiche aussi qui l'a modifiée et quand

---

## 3. Fiches personnes

### 3.1 Liste (`/personnes`)
- [ ] La page affiche la liste des personnes inscrites (`estInscrit = true`)
- [ ] Les personnes supprimées (soft delete) ne sont pas affichées
- [ ] La recherche filtre par nom
- [ ] La pagination fonctionne correctement
- [ ] Tous les rôles peuvent accéder à cette page

### 3.2 Consultation (`/personnes/[id]`)
- [ ] Tous les rôles peuvent consulter une fiche
- [ ] Toutes les sections sont affichées : Identité, Contact, Santé, France Travail, Situation familiale, Ressources
- [ ] Les données affichées correspondent aux données en base

### 3.3 Création (`/personnes/nouvelle`)
- [ ] Nom et prénom sont obligatoires
- [ ] Genre est obligatoire (Homme/Femme)
- [ ] La validation est effectuée côté serveur (Zod)
- [ ] `dateActualisation` est automatiquement mise à la date du jour
- [ ] `estInscrit` est automatiquement `true`
- [ ] La personne créée apparaît dans la liste

### 3.4 Formulaire — Section Identité
- [ ] Champs : nom, prénom, genre, date de naissance, nationalité
- [ ] Le genre peut être modifié après création

### 3.5 Formulaire — Section Contact
- [ ] Champs : adresse, téléphone fixe, téléphone mobile, email
- [ ] Tous les champs sont optionnels

### 3.6 Formulaire — Section Santé
- [ ] Champs : CSS (oui/non), RQTH (oui/non), Invalidité (oui/non)
- [ ] Si Invalidité cochée, la catégorie d'invalidité est demandée
- [ ] Numéro de sécurité sociale (optionnel)

### 3.7 Formulaire — Section France Travail
- [ ] Champs : numéro FT, date d'inscription, code personnel
- [ ] Accompagnement global FT (booléen) — non géré par l'Escale

### 3.8 Formulaire — Section Situation familiale & Mobilité
- [ ] Situation familiale : dropdown avec les valeurs de l'enum
- [ ] Nombre d'enfants à charge
- [ ] Âges des enfants : champs dynamiques (ajouter/supprimer avec +/−)
- [ ] Permis de conduire (oui/non)
- [ ] Véhicule personnel (oui/non)
- [ ] Autres moyens de locomotion (texte libre)
- [ ] Hébergement : dropdown (propriétaire, locataire, hébergé, sans domicile…)

### 3.9 Formulaire — Section Ressources & Orientation
- [ ] Ressources : sélection multiple parmi l'enum (ARE, ASS, RSA, AAH, etc.)
- [ ] Orienté par : sélection parmi l'enum (France Travail, CMS, Mairie, etc.)

### 3.10 Modification (`/personnes/[id]/modifier`)
- [ ] Tous les rôles sauf DIRECTION peuvent modifier
- [ ] DIRECTION ne peut pas accéder à la page de modification
- [ ] Les champs sont pré-remplis
- [ ] Le genre est modifiable
- [ ] `dateActualisation` est mise à jour automatiquement à la sauvegarde

### 3.11 Suppression
- [ ] La suppression est un soft delete (`deletedAt` = date courante)
- [ ] La personne n'apparaît plus dans la liste après suppression
- [ ] Aucun DELETE physique n'est exécuté

---

## 4. Accompagnements ASID

### 4.1 Liste (`/asid`)
- [ ] Accessible par TRAVAILLEUR_SOCIAL et DIRECTION
- [ ] ACCUEIL ne peut pas accéder à cette page
- [ ] Recherche par nom de personne
- [ ] Pagination
- [ ] Affiche : nom, genre, âge, prescripteur, référent, dates

### 4.2 Création atomique (`/asid/nouveau`)
- [ ] Accessible uniquement par TRAVAILLEUR_SOCIAL
- [ ] DIRECTION ne peut pas créer d'ASID
- [ ] La création crée atomiquement : un Accompagnement (FSE) + un SuiviASID + les DémarchesASID initiales
- [ ] Le prescripteur est un CMS : nom + prénom + ville (tous obligatoires)
- [ ] Le référent est sélectionné parmi les utilisateurs de l'application

### 4.3 Données de l'ASID
- [ ] Personne : sélection par autocomplete
- [ ] Date d'entrée : obligatoire
- [ ] Dates de renouvellement (1er, 2ème) : optionnelles
- [ ] Date de sortie : optionnelle, mais obligatoire pour pouvoir créer un nouvel accompagnement ASID (l'ancien doit être clôturé)
- [ ] Ressources à l'entrée : snapshot (RSA, ASS, ARE, AAH, ASI, Sans ressources)
- [ ] Les ressources à l'entrée sont indépendantes des ressources de la fiche personne

### 4.4 Situation avant le suivi
- [ ] "Occupait un emploi" (booléen) → si oui, détail : CDI, CDD > 6 mois, CDD < 6 mois, Intérim, IAE, Indépendant
- [ ] Si pas d'emploi : Formation en cours, En recherche, Ne cherchait pas
- [ ] Niveau de formation : PAS_SCOLARISÉ, PRIMAIRE_3EME, CAP_BAC, DEUG_PLUS
- [ ] Logement : SDF, En exclusion logement
- [ ] RQTH (booléen)
- [ ] Commune de résidence

### 4.5 Fiche détail (`/asid/[id]`)
- [ ] Accessible uniquement par TRAVAILLEUR_SOCIAL
- [ ] Affiche les indicateurs : Orientation N-1, Orientation N, Renouvellements, Suivi N-2, Suivi réalisé
- [ ] Affiche les ressources à l'entrée (lecture seule depuis l'Accompagnement)

### 4.6 Entretiens ASID
- [ ] Ajout inline (sans navigation vers une autre page)
- [ ] Champs : date (obligatoire) + sujets (multi-sélection parmi l'enum) + notes (optionnel)
- [ ] Sujets possibles : SANTE, MOBILITE, EMPLOI, LOGEMENT, ATELIER_REDYNAMISATION, PARENTALITE
- [ ] Suppression inline (soft delete)
- [ ] Date uniquement, pas de durée

### 4.7 Démarches ASID
- [ ] 6 sections avec des booléens :
  - **Santé** : CSS, Suivi santé, Bilan de santé, Soutien psy
  - **Mobilité** : Permis, Véhicule disponible, Inscription auto-école, État véhicule, BDI, Carte solidaire
  - **Logement** : Habitat indigne, Déménagement/accès logement
  - **Emploi** : Recherche, CV/LM, Offres proposées, Entretiens, Contrat de travail, Projet pro/formation, Immersion
  - **Ateliers** : Atelier de redynamisation
  - **Parentalité** : Enfants, Mode de garde, Partenaires (maison familles, 1000 jours, PMI, mission locale)
- [ ] Les démarches sont modifiables et sauvegardées

### 4.8 Modification (`/asid/[id]/modifier`)
- [ ] Accessible uniquement par TRAVAILLEUR_SOCIAL
- [ ] Champs pré-remplis
- [ ] Sauvegarde met à jour les données existantes

---

## 5. Actions collectives / Ateliers

### 5.1 Liste (`/ateliers`)
- [ ] Accessible par TRAVAILLEUR_SOCIAL et DIRECTION
- [ ] ACCUEIL ne peut pas accéder
- [ ] Recherche par thème/nom
- [ ] Pagination
- [ ] Affiche : thème, date, prestataire, lieu, nombre de participants
- [ ] Le compteur de participants se calcule correctement

### 5.2 Création (`/ateliers/nouveau`)
- [ ] Accessible uniquement par TRAVAILLEUR_SOCIAL
- [ ] Champs : catégorie (dropdown), thème (sous-catégorie), titre (texte libre), prestataire (dropdown, optionnel), lieu (texte libre, optionnel), date (obligatoire), notes
- [ ] L'atelier créé apparaît dans la liste

### 5.3 Participants
- [ ] Ajout de participants par autocomplete (recherche par nom)
- [ ] Seules les personnes avec fiche (`estInscrit = true`) peuvent être ajoutées comme participants
- [ ] Suppression de participant = soft delete
- [ ] Le compteur de participants est mis à jour

### 5.4 Détail (`/ateliers/[id]`)
- [ ] Accessible par TRAVAILLEUR_SOCIAL et DIRECTION
- [ ] Affiche toutes les informations de l'atelier
- [ ] Affiche la liste des participants

### 5.5 Modification (`/ateliers/[id]/modifier`)
- [ ] Accessible uniquement par TRAVAILLEUR_SOCIAL
- [ ] DIRECTION ne peut pas modifier
- [ ] Champs pré-remplis

---

## 6. Règles transversales

### 6.1 Soft delete
- [ ] Toute entité a un champ `deletedAt`
- [ ] `deletedAt = null` signifie actif
- [ ] `deletedAt = date` signifie supprimé
- [ ] Aucune requête ne retourne d'entités supprimées (sauf pour l'admin/archives)
- [ ] Jamais de DELETE physique en base

### 6.2 Validation serveur
- [ ] Toutes les entrées utilisateur sont validées côté serveur avec Zod
- [ ] Les champs obligatoires sont vérifiés
- [ ] Les enums sont validés (pas de valeur hors enum)
- [ ] Les types sont vérifiés (dates, nombres, booléens)

### 6.3 Sécurité
- [ ] Chaque appel API vérifie l'authentification
- [ ] Chaque appel API vérifie le rôle
- [ ] Pas de secrets dans le code source
- [ ] Pas de faille XSS (données échappées)
- [ ] Pas d'injection SQL (requêtes paramétrées via Prisma)

### 6.4 Interface
- [ ] Toute l'interface est en français
- [ ] Les messages d'erreur sont en français
- [ ] Navigation cohérente : liens dans le header selon le rôle

### 6.5 Audit trail
- [ ] Les visites enregistrent qui les a saisies (`saisieParId`) et modifiées (`modifieParId`)
- [ ] Les fiches personnes enregistrent qui les a saisies (`saisieParId`) et modifiées (`modifieParId`)
- [ ] Les accompagnements enregistrent qui les a saisis (`saisieParId`) et modifiés (`modifieParId`)
- [ ] Les actions collectives enregistrent qui les a saisies (`saisieParId`) et modifiées (`modifieParId`)
- [ ] L'information est affichée discrètement (tooltip ⓘ) sur les pages de détail : visites, personnes, accompagnements, ateliers

---

## 7. Routes API — Comportements attendus

### 7.1 API Visites
- [ ] `GET /api/visites?date=YYYY-MM-DD` retourne les visites du jour (non supprimées)
- [ ] `POST /api/visites` crée une visite avec audit trail
- [ ] `PUT /api/visites/[id]` modifie une visite et met à jour `modifieParId`
- [ ] `DELETE /api/visites/[id]` effectue un soft delete
- [ ] Les indicateurs (mensuels/annuels) retournent des comptages corrects

### 7.2 API Personnes
- [ ] `GET /api/personnes` retourne les personnes inscrites non supprimées
- [ ] `GET /api/personnes/search?q=nom` retourne les résultats de recherche
- [ ] `POST /api/personnes` crée une personne avec `estInscrit = true` et `dateActualisation = aujourd'hui`
- [ ] `PUT /api/personnes/[id]` met à jour et actualise `dateActualisation`
- [ ] `DELETE /api/personnes/[id]` effectue un soft delete

### 7.3 API ASID
- [ ] `GET /api/asid` retourne la liste des ASID non supprimés
- [ ] `POST /api/asid` crée atomiquement Accompagnement + SuiviASID + Démarches
- [ ] `PUT /api/asid/[id]` met à jour l'ASID
- [ ] Les entretiens sont créés/supprimés via l'API entretiens

### 7.4 API Ateliers
- [ ] `GET /api/ateliers` retourne les ateliers non supprimés avec compteur participants
- [ ] `POST /api/ateliers` crée un atelier
- [ ] `PUT /api/ateliers/[id]` modifie un atelier
- [ ] Participants : ajout et suppression (soft delete) via API dédiée

---

## 8. Cas limites et edge cases

### 8.1 Visites
- [ ] Si une personne a déjà une visite le même jour, le système détecte le doublon et propose la mise à jour de la visite existante (pas de création d'une 2ème visite)
- [ ] Une visite sans aucun motif/démarche coché ne peut pas être enregistrée (au moins un motif obligatoire)
- [ ] Un dossier personne (`estInscrit = true`) ne peut pas être supprimé s'il a des visites ou accompagnements actifs
- [ ] Un dossier auto-généré (`estInscrit = false`) peut être supprimé librement
- [ ] Si un dossier auto-généré supprimé correspond à une nouvelle visite, il est désarchivé (`deletedAt` remis à `null`) plutôt que de créer un doublon

### 8.2 Personnes
- [ ] Une personne inscrite (`estInscrit = true`) apparaît dans la liste `/personnes` même si elle n'a aucune visite
- [ ] Une personne auto-générée (`estInscrit = false`) apparaît dans la liste `/personnes` avec une pastille "dossier à compléter"
- [ ] Compléter le dossier passe `estInscrit` à `true` et retire la pastille
- [ ] Le genre peut être modifié après création

### 8.3 ASID
- [ ] Impossible de créer un ASID pour une personne qui a déjà un ASID actif (sans date de sortie)
- [ ] Impossible de créer un FSE pour une personne qui a déjà un FSE actif
- [ ] Un accompagnement FSE existant peut être transformé/promu en ASID
- [ ] Seul l'ADMIN peut supprimer un accompagnement (ASID ou FSE) — cas exceptionnel (erreur de saisie)
- [ ] Un accompagnement n'est jamais supprimé en usage normal : il a une date de sortie qui le clôture
- [ ] Les travailleurs sociaux clôturent un accompagnement en renseignant la date de sortie, pas en le supprimant
- [ ] Un entretien peut avoir une date antérieure à la date d'entrée ASID (pas de contrôle de cohérence)

### 8.4 Ateliers
- [ ] Ajout d'un participant déjà présent dans l'atelier : doublon empêché (message d'erreur)
- [ ] Atelier sans participant : valide (séance pouvant être reprogrammée)
- [ ] Participant supprimé puis ré-ajouté : la participation existante est restaurée (désarchivée), pas de nouvelle entrée créée
