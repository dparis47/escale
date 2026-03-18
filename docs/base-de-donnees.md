# Documentation de la base de données — L'Escale

> Ce fichier est mis à jour à chaque modification de `prisma/schema.prisma`.

---

## Enums (valeurs énumérées)

| Enum | Valeurs | Usage |
|---|---|---|
| `Role` | ACCUEIL, TRAVAILLEUR_SOCIAL, DIRECTION, ADMIN | Rôle d'un utilisateur de l'application |
| `Genre` | HOMME, FEMME | Genre d'une personne |
| `SituationFamiliale` | MARIE, CELIBATAIRE, DIVORCE, SEPARE, CONCUBINAGE, VEUF, PARENT_ISOLE | Situation familiale d'une personne |
| `OrientePar` | FRANCE_TRAVAIL, CMS, MAIRIE, CONNAISSANCE, CMPA, MAISON_DES_FAMILLES | Origine de l'orientation vers L'Escale |
| `Ressource` | ARE, ASS, RSA, AAH, INVALIDITE, IJ, ASI, SALAIRE, CONJOINT, SANS_RESSOURCE | Type de ressource financière |
| `TypeContrat` | CDI, CDD, CDDI, INTERIM | Type de contrat de travail |
| `NiveauFormation` | PAS_SCOLARISE, PRIMAIRE_3EME, CAP_BAC, DEUG_PLUS | Niveau de formation d'une personne en suivi FSE+ |
| `SujetEntretien` | SANTE, MOBILITE, EMPLOI, LOGEMENT, ATELIER_REDYNAMISATION, PARENTALITE | Sujet abordé lors d'un entretien (accompagnement) |

---

## Tables

### `User` — Utilisateurs de l'application
Comptes de connexion des agents de L'Escale (accueil, travailleur social, direction).

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique auto-incrémenté |
| `nom` | String | Nom de famille |
| `prenom` | String | Prénom |
| `email` | String (unique) | Adresse e-mail utilisée pour la connexion |
| `password` | String | Mot de passe hashé (bcrypt) |
| `role` | Role | Rôle dans l'application (ACCUEIL / TRAVAILLEUR_SOCIAL / DIRECTION) |
| `permissionsOverrides` | Json? | Surcharges de permissions par rapport aux défauts du rôle (null = défauts) |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `Person` — Personne accueillie à L'Escale
Chaque personne accueillie à L'Escale.
Sert de dossier individuel si le formulaire de la personne est complet (`estInscrit = true`) ou un dossier auto-créé pour une visite libre ou anonyme (`estInscrit = false`).

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `nom` | String | Nom de famille |
| `prenom` | String | Prénom |
| `genre` | Genre | Homme ou Femme |
| `dateNaissance` | DateTime? | Date de naissance |
| `nationalite` | String? | Nationalité |
| `adresse` | String? | Adresse postale |
| `telephone` | String? | Téléphone fixe |
| `mobile` | String? | Téléphone mobile |
| `email` | String? | Adresse e-mail |
| `dateActualisation` | DateTime? | Date de dernière mise à jour de la fiche |
| `estInscrit` | Boolean | `true` = fiche complète saisie par le personnel ; `false` = fiche auto-créée (nom libre ou ANONYME) |
| `css` | Boolean | Bénéficiaire de la Complémentaire Santé Solidaire |
| `rqth` | Boolean | Reconnaissance de la Qualité de Travailleur Handicapé |
| `invalidite` | Boolean | En situation d'invalidité |
| `categorieInvalidite` | String? | Catégorie d'invalidité (1, 2, 3) |
| `numeroSecu` | String? | Numéro de sécurité sociale |
| `numeroFT` | String? | Numéro France Travail (demandeur d'emploi) |
| `dateInscriptionFT` | DateTime? | Date d'inscription à France Travail |
| `codepersonnelFT` | String? | Code personnel France Travail |
| `accoGlo` | Boolean | Accompagnement global France Travail (non géré par L'Escale) |
| `numeroCAF` | String? | Numéro d'allocataire CAF |
| `situationFamiliale` | SituationFamiliale? | Situation familiale |
| `nombreEnfantsCharge` | Int? | Nombre d'enfants à charge |
| `agesEnfants` | Int[] | Âges des enfants à charge |
| `permisConduire` | Boolean | Possède le permis de conduire |
| `vehiculePersonnel` | Boolean | Dispose d'un véhicule personnel |
| `autresMoyensLocomotion` | String? | Autres moyens de locomotion (bus, vélo…) |
| `hebergement` | String? | Type d'hébergement (propriétaire, locataire, hébergé…) |
| `ressources` | Ressource[] | Sources de revenus actuelles |
| `orientePar` | OrientePar? | Qui a orienté la personne vers L'Escale |
| `enASID` | Boolean | Indique si la personne est ou a été en suivi ASID |
| `saisieParId` | Int? | ID de l'utilisateur ayant créé la fiche (audit trail) |
| `modifieParId` | Int? | ID de l'utilisateur ayant modifié la fiche en dernier (audit trail) |
| `cvs` | Cv[] | CV et lettres de motivation (tous accompagnements) |
| `createdAt` | DateTime | Date de création de la fiche |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `Visit` — Tableau journalier
Enregistrement de chaque passage à l'accueil. Une ligne par personne par jour. Toujours lié à une `Person` (auto-créée avec `estInscrit = false` si la personne n'a pas de fiche).

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `date` | DateTime (Date) | Date de la visite |
| `personId` | Int | Lien vers la fiche Person (toujours non-null) |
| `orienteParFT` | Boolean | Personne orientée par France Travail pour cette visite |
| `partenaires` | String[] | Partenaires présents lors de cette visite (clés libres) |
| `commentaire` | String? | Commentaire libre sur la visite |
| `fse` | Boolean | Marqué comme visite FSE (comptage annuel, une fois par personne par an) |
| `saisieParId` | Int? | Utilisateur ayant saisi la visite |
| `modifieParId` | Int? | Utilisateur ayant modifié la visite en dernier |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `Demarches` — Démarches unifiées (Visit, Accompagnement)
Table unifiée regroupant les démarches pour deux contextes : visite accueil et accompagnement formel (FSE/ASID/DI). Un seul des deux liens (`visitId`, `accompagnementId`) est non-null selon le contexte. Relation 1-1 dans chaque cas.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `visitId` | Int? (unique) | Lien vers la visite (contexte accueil) |
| `accompagnementId` | Int? (unique) | Lien vers l'accompagnement formel (FSE / ASID / DI) |
| **Accès aux droits** | | |
| `droitsCafMsa` | Boolean | Démarche CAF / MSA |
| **Emploi** | | |
| `emploiRechercheEmploi` | Boolean | Recherche d'emploi |
| `emploiConsultationOffres` | Boolean | Consultation d'offres (enfant de rechercheEmploi) |
| `emploiCandidatures` | Boolean | Envoi de candidatures (enfant de rechercheEmploi) |
| `emploiOffresProposees` | Boolean | Offres proposées par l'Escale |
| `emploiOffresNombre` | Int? | Nombre d'offres proposées |
| `emploiProjetProfessionnel` | Boolean | Projet professionnel / de formation |
| `emploiProjetFormation` | Boolean | Projet de formation |
| `emploiCvLm` | Boolean | CV / lettre de motivation |
| `emploiEntretiens` | Boolean | Entretiens d'embauche |
| `emploiPreparationEntretien` | Boolean | Préparation à l'entretien (enfant d'entretiens) |
| `emploiSimulationEntretien` | Boolean | Simulation d'entretien (enfant d'entretiens) |
| `emploiEchangeFT` | Boolean | Échange France Travail |
| `emploiInscriptionFT` | Boolean | Inscription France Travail |
| `emploiInscriptionJob47` | Boolean | Inscription Job 47 |
| `emploiInscriptionInterim` | Boolean | Inscription en intérim |
| `emploiEspaceFT` | Boolean | Espace France Travail |
| `emploiPmsmp` | Boolean | PMSMP (immersion en entreprise) |
| **Santé** | | |
| `santeRendezVousPASS` | Boolean | Rendez-vous PASS |
| `santeCss` | Boolean | CSS (Complémentaire Santé Solidaire) |
| `santeCssDossier` | Boolean | Dossier CSS (enfant de css) |
| `santeCssOuverture` | Boolean | Ouverture CSS (enfant de css) |
| `santeCarteVitale` | Boolean | Carte Vitale |
| `santeAffiliation` | Boolean | Affiliation droits santé |
| `santeAffiliationSecu` | Boolean | Affiliation Sécurité sociale (enfant) |
| `santeAffiliationMutuelle` | Boolean | Affiliation mutuelle (enfant) |
| `santeInvalidite` | Boolean | Démarche invalidité |
| `santeRattachementEnfants` | Boolean | Rattachement des enfants |
| `santeAme` | Boolean | Aide Médicale de l'État |
| `santeNumeriqueAmeli` | Boolean | Espace numérique Ameli |
| `santeNumeriqueConsultAmeli` | Boolean | Consultation compte Ameli (enfant) |
| `santeDemarchesEchangeCPAM` | Boolean | Échange avec la CPAM |
| `santeDemarchesImpression` | Boolean | Impression / envoi de documents |
| `santeDemarchesInfo` | Boolean | Information sur les droits |
| `santeAccesSoins` | Boolean | Démarches accès aux soins |
| `santeMdph` | Boolean | Dossier MDPH |
| `santeSuiviSante` | Boolean | Suivi du parcours de soin |
| `santeBilanSante` | Boolean | Bilan de santé |
| `santeOrientCpam` | Boolean | Orientation CPAM |
| `santeOrientCramif` | Boolean | Orientation CRAMIF |
| `santeOrientSanteTravail` | Boolean | Orientation Santé au travail |
| `santeOrientMdph` | Boolean | Orientation MDPH |
| `santeOrientPass` | Boolean | Orientation PASS |
| `santeOrientAddictologie` | Boolean | Orientation addictologie |
| `santeOrientMaisonFemmes` | Boolean | Orientation Maison des femmes |
| `santeOrientGemCmpa` | Boolean | Orientation GEM / CMPA |
| `santeOrientMedecins` | Boolean | Orientation médecins |
| `santeOrientDepistage` | Boolean | Orientation dépistage |
| `santeMentale` | Boolean | Santé mentale |
| `santeSoutienPsy` | Boolean | Soutien psychologique |
| **Mobilité** | | |
| `mobilitCarteSolidaire` | Boolean | Carte solidaire |
| `mobilitAutoEcole` | Boolean | Auto-école |
| `mobilitAutoEcoleCode` | Boolean | Code de la route (enfant) |
| `mobilitAutoEcoleConduite` | Boolean | Conduite (enfant) |
| `mobilitBdi` | Boolean | BDI |
| `mobilitBdiPermis` | Boolean | BDI permis (enfant) |
| `mobilitBdiReparation` | Boolean | BDI réparation (enfant) |
| `mobilitApreva` | Boolean | APREVA |
| `mobilitItineraire` | Boolean | Itinéraire / trajet |
| `mobilitMicroCredit` | Boolean | Micro-crédit mobilité |
| `mobilitCovoiturage` | Boolean | Covoiturage |
| **Logement** | | |
| `logementHabitatIndigne` | Boolean | Habitat indigne |
| `logementDemenagement` | Boolean | Déménagement |
| `logementAcces` | Boolean | Accès au logement |
| `logementOrientation` | Boolean | Orientation logement |
| `logementRecherche` | Boolean | Recherche de logement |
| **Inclusion numérique** | | |
| `numeriqueEspaceNumerique` | Boolean | Espace numérique |
| `numeriqueAccompagnement` | Boolean | Accompagnement numérique |
| `numeriqueCoursInfo` | Boolean | Cours informatique |
| **Autres** | | |
| `autresInfoConseil` | Boolean | Infos / conseils |
| `autresInput` | String? | Autres (champ libre) |
| **Lutte contre l'isolement** | | |
| `isolementLienSocial` | Boolean | Lien social |
| **Parentalité** | | |
| `parentaliteSoutien` | Boolean | Soutien à la parentalité |
| `parentaliteModeGarde` | Boolean | Mode de garde |
| `parentalitePmi` | Boolean | PMI |
| `parentaliteMaisonFamilles` | Boolean | Maison des familles |
| `parentaliteMaison1000` | Boolean | Maison 1000 jours |
| `parentaliteCafeCulturel` | Boolean | Café culturel |
| `parentaliteMissionLocale` | Boolean | Mission locale |
| `parentaliteAutreInput` | String? | Parentalité autre (champ libre) |
| **Ateliers de redynamisation** | | |
| `atelierParticipation` | Boolean | Participation à un atelier |
| `actionCollectiveId` | Int? | Lien vers la séance d'atelier (ActionCollective) |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |

---

### `ContratTravail` — Contrats de travail
Historique des contrats de travail obtenus par une personne. Plusieurs contrats possibles par personne. Visible sur la fiche accompagnement (section "Contrat(s) de travail") et dans le bilan France Travail.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `personId` | Int | Lien vers la fiche Person |
| `type` | TypeContrat | Type de contrat (CDI, CDD, CDDI, INTERIM) |
| `dateDebut` | DateTime (Date) | Date de début du contrat |
| `dateFin` | DateTime? (Date) | Date de fin (null si CDI ou en cours) |
| `employeur` | String? | Nom de l'employeur |
| `ville` | String? | Ville du poste |
| `poste` | String? | Intitulé du poste |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `Accompagnement` — Accompagnement formel (FSE+, ASID) ou Dossier individuel (DI)
Coquille commune pour tous les accompagnements. Porte les données partagées : personne, dates, ressources à l'entrée, situation avant, niveau de formation, logement, observation. Un `SuiviASID` ou un `SuiviDI` (dossier individuel) peut y être rattaché via relation 1-1. Un dossier individuel est auto-créé à la première visite de chaque personne. Les démarches sont dans `Demarches` (via `accompagnementId`). Plusieurs accompagnements possibles par personne.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `personId` | Int | Lien vers la fiche Person |
| `dateEntree` | DateTime (Date) | Date d'entrée dans l'accompagnement |
| `dateSortie` | DateTime? (Date) | Date de sortie de l'accompagnement |
| `ressourceRSA` | Boolean | Bénéficiait du RSA à l'entrée |
| `ressourceASS` | Boolean | Bénéficiait de l'ASS à l'entrée |
| `ressourceARE` | Boolean | Bénéficiait de l'ARE à l'entrée |
| `ressourceAAH` | Boolean | Bénéficiait de l'AAH à l'entrée |
| `ressourceASI` | Boolean | Bénéficiait de l'ASI à l'entrée |
| `ressourceSansRessources` | Boolean | Sans ressources à l'entrée |
| `avantOccupeEmploi` | Boolean | Occupait un emploi avant l'entrée |
| `avantCDI` | Boolean | CDI avant l'entrée (si avantOccupeEmploi) |
| `avantCDDPlus6Mois` | Boolean | CDD > 6 mois avant l'entrée (si avantOccupeEmploi) |
| `avantCDDMoins6Mois` | Boolean | CDD ≤ 6 mois avant l'entrée (si avantOccupeEmploi) |
| `avantInterim` | Boolean | Intérim avant l'entrée (si avantOccupeEmploi) |
| `avantIAE` | Boolean | IAE avant l'entrée (si avantOccupeEmploi) |
| `avantIndependant` | Boolean | Travailleur indépendant avant l'entrée (si avantOccupeEmploi) |
| `avantFormationPro` | Boolean | En formation professionnelle avant l'entrée (si !avantOccupeEmploi) |
| `avantEnRechercheEmploi` | Boolean | En recherche d'emploi avant l'entrée (si !avantOccupeEmploi) |
| `avantNeCherchePasEmploi` | Boolean | Ne cherchait pas d'emploi avant l'entrée (si !avantOccupeEmploi) |
| `niveauFormation` | NiveauFormation? | Niveau de formation à l'entrée |
| `reconnaissanceHandicap` | Boolean | Reconnaissance de la qualité de travailleur handicapé (RQTH) |
| `logementSDF` | Boolean | Sans domicile fixe à l'entrée |
| `logementExclusion` | Boolean | En situation d'exclusion du logement à l'entrée |
| `estBrouillon` | Boolean | `true` = créé automatiquement (import Excel) — à compléter par un travailleur social |
| `observation` | String? | Observations libres |
| `saisieParId` | Int? | ID de l'utilisateur ayant créé l'accompagnement (audit trail) |
| `modifieParId` | Int? | ID de l'utilisateur ayant modifié l'accompagnement en dernier (audit trail) |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `AccompagnementSortie` — Situation de sortie FSE+
Indicateurs de situation à la sortie d'un accompagnement formel. Relation 1-1 avec `Accompagnement`. Inclut également les informations de formation si la sortie est une entrée en formation.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `accompagnementId` | Int (unique) | Lien vers l'accompagnement (relation 1-1) |
| `sortieCDDMoins6Mois` | Boolean | Sorti en CDD < 6 mois |
| `sortieCDDPlus6Mois` | Boolean | Sorti en CDD ≥ 6 mois |
| `sortieCDI` | Boolean | Sorti en CDI |
| `sortieIAE` | Boolean | Sorti en IAE |
| `sortieInterim` | Boolean | Sorti en intérim |
| `sortieIndependant` | Boolean | Sorti comme indépendant |
| `sortieMaintienEmploi` | Boolean | Maintien en emploi |
| `sortieRechercheEmploi` | Boolean | Toujours en recherche d'emploi à la sortie |
| `sortieInactif` | Boolean | Inactif à la sortie |
| `sortieFormation` | Boolean | En formation à la sortie |
| `sortieCreationEntreprise` | Boolean | Création d'entreprise à la sortie |
| `sortieInfoContratHorsDelai` | Boolean | Information contrat hors délai |
| `formationIntitule` | String? | Intitulé de la formation (si sortie = formation) |
| `formationOrganisme` | String? | Organisme de formation |
| `formationVille` | String? | Ville de la formation |
| `formationDuree` | String? | Durée de la formation |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |

---

### `SuiviASID` — Données spécifiques au suivi ASID
Données propres au suivi ASID (Accompagnement Socio-professionnel Individuel et Durable), rattaché à un `Accompagnement` via relation 1-1. Prescripteur = toujours un CMS. Porte les indicateurs annuels et les prescriptions.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `accompagnementId` | Int (unique) | Lien vers l'accompagnement (relation 1-1) |
| `referentNom` | String? | Nom du référent RSA (libre texte) |
| `referentPrenom` | String? | Prénom du référent RSA (libre texte) |
| `prescripteurNom` | String? | Nom du prescripteur (CMS) |
| `prescripteurPrenom` | String? | Prénom du prescripteur (CMS) |
| `communeResidence` | String? | Commune de résidence de la personne |
| `dateEntree` | DateTime (Date) | Date d'entrée dans l'ASID |
| `dateRenouvellement` | DateTime? (Date) | Date du 1er renouvellement |
| `dateRenouvellement2` | DateTime? (Date) | Date du 2ème renouvellement |
| `dateSortie` | DateTime? (Date) | Date de sortie de l'ASID |
| `orientationNMoins1` | Boolean | Orientation reçue l'année N-1 |
| `orientationN` | Boolean | Orientation reçue l'année N |
| `renouvellementN` | Int | Nombre de renouvellements (0, 1 ou 2) |
| `suiviNMoins2EnCours` | Boolean | Suivi démarré en N-2 encore en cours |
| `suiviRealise` | Boolean | Suivi effectivement réalisé |
| `suiviNonRealiseRaison` | String? | Raison si suivi non réalisé |
| `reorientation` | Boolean | Réorientation effectuée |
| `reorientationDescription` | String? | Description de la réorientation |
| `observation` | String? | Observations libres |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `FichePrescriptionASID` — Fiches de prescription jointes à un suivi ASID
Documents PDF de prescription rattachés à un suivi ASID. Plusieurs possibles par ASID. Le champ `periode` indique à quelle étape du suivi la prescription correspond.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `accompagnementId` | Int | Lien vers le suivi ASID |
| `nom` | String | Nom original du fichier |
| `periode` | String? | Étape du suivi : `"ENTREE"`, `"RENOUVELLEMENT_1"` ou `"RENOUVELLEMENT_2"` |
| `contenu` | Bytes | Contenu du PDF stocké en base |
| `createdAt` | DateTime | Date de création |

---

### `Cv` — CV et lettres de motivation
Documents (CV, lettre de motivation) rattachés à une personne. Commun à tous les types d'accompagnement (ASID, DI, FSE+). Plusieurs possibles par personne.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `personId` | Int | Lien vers la fiche Person |
| `nom` | String | Nom original du fichier |
| `contenu` | Bytes | Contenu du fichier stocké en base (PDF ou Word) |
| `createdAt` | DateTime | Date de création |

---

### `SuiviDI` — Dossier individuel (DI, anciennement Espace d'Insertion)
Marqueur de dossier individuel, rattaché à un `Accompagnement` via relation 1-1. Auto-créé à la première visite de chaque personne. Plus léger que le FSE : pas de ressources à l'entrée ni de situation avant/sortie. Porte uniquement une observation.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `accompagnementId` | Int (unique) | Lien vers l'accompagnement (relation 1-1) |
| `observation` | String? | Observations libres |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `Entretien` — Entretiens individuels
Rendez-vous individuels réalisés dans le cadre d'un accompagnement formel (FSE, ASID ou DI).

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `accompagnementId` | Int? | Lien vers l'accompagnement |
| `date` | DateTime (Date) | Date de l'entretien |
| `sujets` | SujetEntretien[] | Sujets abordés lors de l'entretien |
| `notes` | String? | Notes libres sur l'entretien |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `CategorieAtelier` — Catégories d'ateliers
Catégories regroupant les thèmes d'actions collectives. Gérables dynamiquement depuis l'interface (ajout, renommage, changement de couleur).

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `nom` | String (unique) | Nom de la catégorie (ex : « santé - bien-être ») |
| `couleur` | String | Clé couleur Tailwind (pink, green, red, amber, indigo, blue…) |
| `ordre` | Int | Ordre d'affichage |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `ThemeAtelierRef` — Thèmes d'ateliers (référentiel)
Thèmes d'actions collectives, rattachés à une catégorie. Gérables dynamiquement depuis l'interface. Contrainte d'unicité sur `(categorieId, nom)`.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `nom` | String | Nom du thème (ex : « socio-esthétique ») |
| `categorieId` | Int (FK → CategorieAtelier) | Catégorie parente |
| `ordre` | Int | Ordre d'affichage au sein de la catégorie |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `Prestataire` — Prestataires d'ateliers
Intervenants ou prestataires pouvant animer des actions collectives. Gérables dynamiquement depuis le formulaire d'atelier.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `nom` | String (unique) | Nom du prestataire |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `ActionCollective` — Actions collectives (ateliers)
Séances d'ateliers collectifs organisés par L'Escale. Le thème est une référence vers `ThemeAtelierRef` (lui-même rattaché à une `CategorieAtelier`). Le prestataire est une référence optionnelle vers `Prestataire`.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `themeId` | Int (FK → ThemeAtelierRef) | Thème de l'atelier |
| `themeAutre` | String? | Titre de la séance (ex : titre du film pour « cinéma ») |
| `prestataireId` | Int? (FK → Prestataire) | Prestataire ou intervenant |
| `lieu` | String? | Lieu de l'atelier |
| `date` | DateTime (Date) | Date de la séance |
| `notes` | String? | Notes libres |
| `saisieParId` | Int? | ID de l'utilisateur ayant créé l'atelier (audit trail) |
| `modifieParId` | Int? | ID de l'utilisateur ayant modifié l'atelier en dernier (audit trail) |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `ParticipationAtelier` — Participants aux ateliers
Lien entre une personne (avec fiche obligatoire) et une action collective.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `actionCollectiveId` | Int | Lien vers l'atelier |
| `personId` | Int | Lien vers la fiche Person (toujours obligatoire) |
| `createdAt` | DateTime | Date de création |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `FichierEmargement` — Feuilles d'émargement des ateliers
Fichiers d'émargement (PDF) associés à une séance d'atelier (ActionCollective).

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `actionCollectiveId` | Int (FK → ActionCollective) | Séance d'atelier concernée |
| `nom` | String | Nom du fichier |
| `contenu` | Bytes | Contenu du fichier stocké en base |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |

---

### `CompteurPartenaire` — Compteurs journaliers par partenaire
Compteur manuel du nombre de personnes reçues par partenaire pour une date donnée (usage statistique). Contrainte d'unicité sur `(date, partenaire)`.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `date` | DateTime (Date) | Date concernée |
| `partenaire` | String | Clé du partenaire |
| `count` | Int | Nombre de personnes reçues |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |

---

### `PersonnePartenaire` — Personnes reçues par partenaire
Liste nominative (ou anonyme) des personnes reçues par un partenaire donné. Une entrée par personne par date par partenaire. Les entrées anonymes ont `nom = "(anonyme)"`. Contrainte d'index sur `(date, partenaire)`.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `date` | DateTime (Date) | Date de la réception |
| `partenaire` | String | Clé du partenaire |
| `nom` | String | Nom de la personne, ou `"(anonyme)"` si inconnue |
| `dateRDV` | DateTime (Date) | Date effective du rendez-vous (peut différer de `date`) |
| `createdAt` | DateTime | Date de création |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `AuditLog` — Journal d'activité
Trace chaque action significative (création, modification, suppression, restauration) réalisée par un utilisateur. Visible uniquement par le rôle ADMIN.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `userId` | Int (FK → User) | Utilisateur ayant effectué l'action |
| `action` | String | Type d'action : `creer`, `modifier`, `supprimer`, `restaurer` |
| `entite` | String | Entité concernée : `visite`, `personne`, `accompagnement`, `atelier`, `utilisateur` |
| `entiteId` | Int | Identifiant de l'entité concernée |
| `details` | String? | Description courte en français |
| `createdAt` | DateTime | Date et heure de l'action |

Index : `(entite, entiteId)`, `(userId)`, `(createdAt)`
