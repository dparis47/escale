# Documentation de la base de données — L'Escale

> Ce fichier est mis à jour à chaque modification de `prisma/schema.prisma`.

---

## Enums (valeurs énumérées)

| Enum | Valeurs | Usage |
|---|---|---|
| `Role` | ACCUEIL, TRAVAILLEUR_SOCIAL, DIRECTION | Rôle d'un utilisateur de l'application |
| `Genre` | HOMME, FEMME | Genre d'une personne |
| `SituationFamiliale` | MARIE, CELIBATAIRE, DIVORCE, SEPARE, CONCUBINAGE, VEUF, PARENT_ISOLE | Situation familiale d'une personne |
| `OrientePar` | FRANCE_TRAVAIL, CMS, MAIRIE, CONNAISSANCE, CMPA, MAISON_DES_FAMILLES | Origine de l'orientation vers L'Escale |
| `Ressource` | ARE, ASS, RSA, AAH, INVALIDITE, IJ, ASI, SALAIRE, CONJOINT, SANS_RESSOURCE | Type de ressource financière |
| `TypeContrat` | CDI, CDD, CDDI, INTERIM | Type de contrat de travail |
| `ThemeAtelier` | COURS_INFORMATIQUE, CINEMA, SOCIO_ESTHETIQUE, RANDONNEE, SPORT, PISCINE, BUDGET, SANTE_ENVIRONNEMENT, CUISINE, CUISINE_ANTI_GASPI, MEDIATION_EQUINE, ATELIER_CREATIF, CULTUREL, NOEL, PROJET_CINEMA, AUTRE | Thème d'une action collective |
| `SujetEntretien` | SANTE, MOBILITE, EMPLOI, LOGEMENT, ATELIER_REDYNAMISATION, PARENTALITE | Sujet abordé lors d'un entretien (ASID ou FSE) |
| `NiveauFormation` | PAS_SCOLARISE, PRIMAIRE_3EME, CAP_BAC, DEUG_PLUS | Niveau de formation d'une personne en suivi FSE+ |

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
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `Person` — Fiches d'inscription
Fiche individuelle de chaque personne accueillie à L'Escale. Peut être une fiche complète (`estInscrit = true`) ou une fiche auto-créée pour une visite libre ou anonyme (`estInscrit = false`).

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
| `commentaire` | String? | Commentaire libre sur la visite |
| `fse` | Boolean | Marqué comme visite FSE (comptage annuel, une fois par personne par an) |
| `saisieParId` | Int? | Utilisateur ayant saisi la visite |
| `modifieParId` | Int? | Utilisateur ayant modifié la visite en dernier |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `Demarches` — Démarches unifiées (Visit, FSE, ASID)
Table unifiée regroupant les démarches pour les trois contextes : visite accueil, suivi FSE+ et suivi ASID. Un seul des trois liens (`visitId`, `fseId`, `asidId`) est non-null selon le contexte. Relation 1-1 dans chaque cas.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `visitId` | Int? (unique) | Lien vers la visite (contexte accueil) |
| `fseId` | Int? (unique) | Lien vers le suivi FSE+ |
| `asidId` | Int? (unique) | Lien vers le suivi ASID |
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
| `atelierNom` | String? | Nom de l'atelier |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |

---

### `ResultatASID` — Résultats contrats du suivi ASID
Indicateurs de contrats de travail obtenus dans le cadre d'un suivi ASID. Relation 1-1 avec `AccompagnementASID`, créé automatiquement à la création de l'ASID.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `accompagnementId` | Int (unique) | Lien vers le suivi ASID (relation 1-1) |
| `contratCDI` | Boolean | CDI obtenu |
| `contratCDD` | Boolean | CDD obtenu |
| `contratInterim` | Boolean | Intérim obtenu |
| `contratIAE` | Boolean | Contrat IAE obtenu |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |

---

### `AccompagnementFSE` — Suivi FSE+ (Fond Social Européen)
Accompagnement formel d'une personne dans le cadre du FSE+. Plusieurs FSE possibles par personne. Tout ASID est aussi un FSE. Un FSE peut exister sans ASID (suivi FSE+ seul). Les démarches effectuées sont dans la table `Demarches` liée via `fseId`.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `personId` | Int | Lien vers la fiche Person |
| `referentId` | Int? | Référent (utilisateur de l'application) |
| `dateEntree` | DateTime (Date) | Date d'entrée dans le FSE+ |
| `dateSortie` | DateTime? (Date) | Date de sortie du FSE+ |
| `ressourceRSA` | Boolean | Bénéficiait du RSA à l'entrée |
| `ressourceASS` | Boolean | Bénéficiait de l'ASS à l'entrée |
| `ressourceARE` | Boolean | Bénéficiait de l'ARE à l'entrée |
| `ressourceAAH` | Boolean | Bénéficiait de l'AAH à l'entrée |
| `ressourceASI` | Boolean | Bénéficiait de l'ASI à l'entrée |
| `ressourceSansRessources` | Boolean | Sans ressources à l'entrée |
| `avantOccupeEmploi` | Boolean | Occupait un emploi avant l'entrée dans le FSE+ |
| `avantIndependant` | Boolean | Travailleur indépendant avant le FSE+ (si avantOccupeEmploi) |
| `avantCDI` | Boolean | Occupait un CDI avant le FSE+ (si avantOccupeEmploi) |
| `avantCDDPlus6Mois` | Boolean | Occupait un CDD > 6 mois avant le FSE+ (si avantOccupeEmploi) |
| `avantCDDMoins6Mois` | Boolean | Occupait un CDD ≤ 6 mois avant le FSE+ (si avantOccupeEmploi) |
| `avantInterim` | Boolean | En intérim avant le FSE+ (si avantOccupeEmploi) |
| `avantIAE` | Boolean | En IAE avant le FSE+ (si avantOccupeEmploi) |
| `avantFormationPro` | Boolean | En formation professionnelle avant le FSE+ (si !avantOccupeEmploi) |
| `avantEnRechercheEmploi` | Boolean | En recherche d'emploi avant le FSE+ (si !avantOccupeEmploi) |
| `avantNeCherchePasEmploi` | Boolean | Ne cherchait pas d'emploi immédiat avant le FSE+ (si !avantOccupeEmploi) |
| `niveauFormation` | NiveauFormation? | Niveau de formation à l'entrée |
| `reconnaissanceHandicap` | Boolean | Reconnaissance de la qualité de travailleur handicapé (RQTH) |
| `logementSDF` | Boolean | Sans domicile fixe à l'entrée |
| `logementExclusion` | Boolean | En situation d'exclusion du logement à l'entrée |
| `sortieCDDMoins6Mois` | Boolean | Sorti en CDD < 6 mois |
| `sortieCDDPlus6Mois` | Boolean | Sorti en CDD ≥ 6 mois |
| `sortieCDI` | Boolean | Sorti en CDI |
| `sortieIAE` | Boolean | Sorti en IAE |
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
| `observation` | String? | Observations libres |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `AccompagnementASID` — Suivi ASID
Accompagnement socio-professionnel individuel et durable. Toujours lié à un FSE. Prescripteur = toujours un CMS. Les démarches sont dans `Demarches` (via `asidId`) et les indicateurs contrats dans `ResultatASID`.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `personId` | Int | Lien vers la fiche Person |
| `fseId` | Int (unique) | Lien vers le FSE associé (relation 1-1) |
| `referentId` | Int? | Référent parmi les utilisateurs |
| `referentNom` | String? | Nom libre du référent (si non utilisateur) |
| `referentPrenom` | String? | Prénom libre du référent |
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

### `Entretien` — Entretiens individuels (ASID ou FSE)
Rendez-vous individuels réalisés dans le cadre d'un suivi ASID ou FSE+. Un seul de `asidId` ou `fseId` est non-null.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `asidId` | Int? | Lien vers le suivi ASID (null si entretien FSE) |
| `fseId` | Int? | Lien vers le suivi FSE+ (null si entretien ASID) |
| `date` | DateTime (Date) | Date de l'entretien |
| `sujets` | SujetEntretien[] | Sujets abordés lors de l'entretien |
| `notes` | String? | Notes libres sur l'entretien |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
| `deletedAt` | DateTime? | Soft delete — null = actif |

---

### `ContratTravail` — Contrats de travail
Historique des contrats de travail obtenus par une personne. Plusieurs contrats possibles par personne. Visible sur la fiche ASID (section "Contrat(s) de travail") et dans le bilan France Travail.

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

### `FichePrescriptionASID` — Fiches de prescription jointes à un suivi ASID
Documents PDF de prescription rattachés à un accompagnement ASID. Plusieurs possibles par ASID.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `accompagnementId` | Int | Lien vers le suivi ASID |
| `nom` | String | Nom original du fichier |
| `contenu` | Bytes | Contenu du PDF stocké en base |
| `createdAt` | DateTime | Date de création |

---

### `CvASID` — CV et lettres de motivation d'un suivi ASID
Documents (CV, lettre de motivation) rattachés à un accompagnement ASID. Plusieurs possibles par ASID.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `accompagnementId` | Int | Lien vers le suivi ASID |
| `nom` | String | Nom original du fichier |
| `contenu` | Bytes | Contenu du fichier stocké en base |
| `createdAt` | DateTime | Date de création |

---

### `ActionCollective` — Actions collectives (ateliers)
Séances d'ateliers collectifs organisés par L'Escale.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `theme` | ThemeAtelier | Thème de l'atelier |
| `themeAutre` | String? | Précision si thème = AUTRE |
| `prestataire` | String? | Nom du prestataire ou intervenant |
| `lieu` | String? | Lieu de l'atelier |
| `date` | DateTime (Date) | Date de la séance |
| `notes` | String? | Notes libres |
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
Fichiers d'émargement (PDF ou autre) associés à un thème d'atelier.

| Champ | Type | Description |
|---|---|---|
| `id` | Int (PK) | Identifiant unique |
| `theme` | ThemeAtelier | Thème d'atelier concerné |
| `nom` | String | Nom du fichier |
| `contenu` | Bytes | Contenu du fichier stocké en base |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |
