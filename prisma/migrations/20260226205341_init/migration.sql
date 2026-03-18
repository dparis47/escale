-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ACCUEIL', 'TRAVAILLEUR_SOCIAL', 'DIRECTION');

-- CreateEnum
CREATE TYPE "Genre" AS ENUM ('HOMME', 'FEMME');

-- CreateEnum
CREATE TYPE "SituationFamiliale" AS ENUM ('MARIE', 'CELIBATAIRE', 'DIVORCE', 'SEPARE', 'CONCUBINAGE', 'VEUF');

-- CreateEnum
CREATE TYPE "OrientePar" AS ENUM ('FRANCE_TRAVAIL', 'CMS', 'MAIRIE', 'CONNAISSANCE', 'CMPA', 'MAISON_DES_FAMILLES');

-- CreateEnum
CREATE TYPE "Ressource" AS ENUM ('ARE', 'ASS', 'RSA', 'AAH', 'INVALIDITE', 'IJ', 'ASI', 'SALAIRE', 'CONJOINT', 'SANS_RESSOURCE');

-- CreateEnum
CREATE TYPE "MotifVisite" AS ENUM ('MSA_CAF', 'SANTE', 'PASS', 'LOGEMENT', 'MOBILITE', 'CV_LM', 'EMPLOI', 'RECHERCHES_ADMIN', 'INSCRIPTION_REINSCRIPTION_FT', 'CREATION_COMPTE_FT', 'ACCOMPAGNEMENT_NUMERIQUE', 'INTERNET', 'INFOS_CONSEILS', 'LIEN_SOCIAL', 'ATELIERS', 'COURS_INFORMATIQUE', 'ASID');

-- CreateEnum
CREATE TYPE "TypeContrat" AS ENUM ('CDI', 'CDD', 'CDDI', 'INTERIM');

-- CreateEnum
CREATE TYPE "ThemeAtelier" AS ENUM ('COURS_INFORMATIQUE', 'CINEMA', 'SOCIO_ESTHETIQUE', 'RANDONNEE', 'SPORT', 'PISCINE', 'BUDGET', 'SANTE_ENVIRONNEMENT', 'CUISINE', 'CUISINE_ANTI_GASPI', 'MEDIATION_EQUINE', 'ATELIER_CREATIF', 'CULTUREL', 'NOEL', 'PROJET_CINEMA', 'AUTRE');

-- CreateEnum
CREATE TYPE "SujetEntretienASID" AS ENUM ('SANTE', 'MOBILITE', 'EMPLOI', 'LOGEMENT', 'ATELIER_REDYNAMISATION', 'PARENTALITE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "genre" "Genre" NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "nationalite" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "dateActualisation" TIMESTAMP(3),
    "css" BOOLEAN NOT NULL DEFAULT false,
    "rqth" BOOLEAN NOT NULL DEFAULT false,
    "invalidite" BOOLEAN NOT NULL DEFAULT false,
    "categorieInvalidite" TEXT,
    "numeroFT" TEXT,
    "dateInscriptionFT" TIMESTAMP(3),
    "codepersonnelFT" TEXT,
    "accoGlo" BOOLEAN NOT NULL DEFAULT false,
    "numeroCAF" TEXT,
    "situationFamiliale" "SituationFamiliale",
    "nombreEnfantsCharge" INTEGER,
    "agesEnfants" INTEGER[],
    "permisConduire" BOOLEAN NOT NULL DEFAULT false,
    "vehiculePersonnel" BOOLEAN NOT NULL DEFAULT false,
    "autresMoyensLocomotion" TEXT,
    "hebergement" TEXT,
    "ressources" "Ressource"[],
    "orientePar" "OrientePar",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "genre" "Genre" NOT NULL,
    "personId" INTEGER,
    "motifs" "MotifVisite"[],
    "orienteParFT" BOOLEAN NOT NULL DEFAULT false,
    "commentaire" TEXT,
    "saisieParId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSante" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "personId" INTEGER,
    "visitId" INTEGER,
    "dossierCSS" BOOLEAN NOT NULL DEFAULT false,
    "carteVitale" BOOLEAN NOT NULL DEFAULT false,
    "affiliationDroitsSante" BOOLEAN NOT NULL DEFAULT false,
    "affiliationMutuelle" BOOLEAN NOT NULL DEFAULT false,
    "invalidite" BOOLEAN NOT NULL DEFAULT false,
    "rattachementEnfants" BOOLEAN NOT NULL DEFAULT false,
    "ame" BOOLEAN NOT NULL DEFAULT false,
    "creationCompteAmeli" BOOLEAN NOT NULL DEFAULT false,
    "consultationAmeli" BOOLEAN NOT NULL DEFAULT false,
    "echangeCpam" BOOLEAN NOT NULL DEFAULT false,
    "impressionDocuments" BOOLEAN NOT NULL DEFAULT false,
    "informationDroits" BOOLEAN NOT NULL DEFAULT false,
    "demarchesAccesSoins" BOOLEAN NOT NULL DEFAULT false,
    "dossierMDPH" BOOLEAN NOT NULL DEFAULT false,
    "suiviParcoursSoin" BOOLEAN NOT NULL DEFAULT false,
    "bilanSante" BOOLEAN NOT NULL DEFAULT false,
    "orientationCpam" BOOLEAN NOT NULL DEFAULT false,
    "orientationCramif" BOOLEAN NOT NULL DEFAULT false,
    "orientationSanteTravail" BOOLEAN NOT NULL DEFAULT false,
    "orientationMDPH" BOOLEAN NOT NULL DEFAULT false,
    "orientationPASS" BOOLEAN NOT NULL DEFAULT false,
    "orientationAddictologie" BOOLEAN NOT NULL DEFAULT false,
    "orientationMaisonFemmes" BOOLEAN NOT NULL DEFAULT false,
    "orientationGemCmpa" BOOLEAN NOT NULL DEFAULT false,
    "orientationMedecins" BOOLEAN NOT NULL DEFAULT false,
    "orientationDepistage" BOOLEAN NOT NULL DEFAULT false,
    "santeMentale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceSante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratDeTravail" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "type" "TypeContrat" NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE,
    "employeur" TEXT,
    "ville" TEXT,
    "poste" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContratDeTravail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccompagnementFSE" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "referentId" INTEGER,
    "dateEntree" DATE NOT NULL,
    "dateSortie" DATE,
    "rsaDateEntree" DATE,
    "rsaDateSortie" DATE,
    "ressourceRSA" BOOLEAN NOT NULL DEFAULT false,
    "ressourceASS" BOOLEAN NOT NULL DEFAULT false,
    "ressourceARE" BOOLEAN NOT NULL DEFAULT false,
    "ressourceAAH" BOOLEAN NOT NULL DEFAULT false,
    "ressourceSalaireConjoint" BOOLEAN NOT NULL DEFAULT false,
    "ressourceInvalidite" BOOLEAN NOT NULL DEFAULT false,
    "ressourceSansRessources" BOOLEAN NOT NULL DEFAULT false,
    "avantCDDMoins6Mois" BOOLEAN NOT NULL DEFAULT false,
    "avantCDDPlus6Mois" BOOLEAN NOT NULL DEFAULT false,
    "avantCDI" BOOLEAN NOT NULL DEFAULT false,
    "avantIAE" BOOLEAN NOT NULL DEFAULT false,
    "avantIndependant" BOOLEAN NOT NULL DEFAULT false,
    "demarcheDroitsCAF" BOOLEAN NOT NULL DEFAULT false,
    "demarcheSante" BOOLEAN NOT NULL DEFAULT false,
    "demarcheCSS" BOOLEAN NOT NULL DEFAULT false,
    "demarcheBilanSante" BOOLEAN NOT NULL DEFAULT false,
    "demarcheMobilite" BOOLEAN NOT NULL DEFAULT false,
    "demarcheRechercheEmploi" BOOLEAN NOT NULL DEFAULT false,
    "demarcheCV" BOOLEAN NOT NULL DEFAULT false,
    "demarcheLogement" BOOLEAN NOT NULL DEFAULT false,
    "demarcheAteliers" BOOLEAN NOT NULL DEFAULT false,
    "demarcheNumerique" BOOLEAN NOT NULL DEFAULT false,
    "demarchePassNumerique" BOOLEAN NOT NULL DEFAULT false,
    "demarcheParentalite" BOOLEAN NOT NULL DEFAULT false,
    "sortieCDDMoins6Mois" BOOLEAN NOT NULL DEFAULT false,
    "sortieCDDPlus6Mois" BOOLEAN NOT NULL DEFAULT false,
    "sortieCDI" BOOLEAN NOT NULL DEFAULT false,
    "sortieIAE" BOOLEAN NOT NULL DEFAULT false,
    "sortieIndependant" BOOLEAN NOT NULL DEFAULT false,
    "sortieMaintienEmploi" BOOLEAN NOT NULL DEFAULT false,
    "sortieRechercheEmploi" BOOLEAN NOT NULL DEFAULT false,
    "sortieInactif" BOOLEAN NOT NULL DEFAULT false,
    "sortieFormation" BOOLEAN NOT NULL DEFAULT false,
    "sortieCreationEntreprise" BOOLEAN NOT NULL DEFAULT false,
    "sortieInfoContratHorsDelai" BOOLEAN NOT NULL DEFAULT false,
    "formationIntitule" TEXT,
    "formationOrganisme" TEXT,
    "formationVille" TEXT,
    "formationDuree" TEXT,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccompagnementFSE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccompagnementASID" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "fseId" INTEGER NOT NULL,
    "referentId" INTEGER,
    "prescripteurNom" TEXT,
    "prescripteurPrenom" TEXT,
    "prescripteurVille" TEXT,
    "communeResidence" TEXT,
    "dateEntree" DATE NOT NULL,
    "dateRenouvellement" DATE,
    "dateSortie" DATE,
    "orientationNMoins1" BOOLEAN NOT NULL DEFAULT false,
    "orientationN" BOOLEAN NOT NULL DEFAULT false,
    "renouvellementN" BOOLEAN NOT NULL DEFAULT false,
    "suiviNMoins2EnCours" BOOLEAN NOT NULL DEFAULT false,
    "suiviRealise" BOOLEAN NOT NULL DEFAULT true,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccompagnementASID_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntretienASID" (
    "id" SERIAL NOT NULL,
    "accompagnementId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "sujets" "SujetEntretienASID"[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EntretienASID_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemarcheASID" (
    "id" SERIAL NOT NULL,
    "accompagnementId" INTEGER NOT NULL,
    "css" BOOLEAN NOT NULL DEFAULT false,
    "suiviSante" BOOLEAN NOT NULL DEFAULT false,
    "bilanSante" BOOLEAN NOT NULL DEFAULT false,
    "soutienPsy" BOOLEAN NOT NULL DEFAULT false,
    "permisObtenu" BOOLEAN NOT NULL DEFAULT false,
    "vehiculeDisponible" BOOLEAN NOT NULL DEFAULT false,
    "inscriptionAutoEcole" BOOLEAN NOT NULL DEFAULT false,
    "autoEcoleCode" BOOLEAN NOT NULL DEFAULT false,
    "autoEcoleConduite" BOOLEAN NOT NULL DEFAULT false,
    "etatVehicule" TEXT,
    "bdiVoiture" BOOLEAN NOT NULL DEFAULT false,
    "bdiPermis" BOOLEAN NOT NULL DEFAULT false,
    "carteSolidaire" BOOLEAN NOT NULL DEFAULT false,
    "habitatIndigne" BOOLEAN NOT NULL DEFAULT false,
    "demenagementsAcces" BOOLEAN NOT NULL DEFAULT false,
    "rechercheEmploi" BOOLEAN NOT NULL DEFAULT false,
    "cvLm" BOOLEAN NOT NULL DEFAULT false,
    "offresProposees" BOOLEAN NOT NULL DEFAULT false,
    "entretiens" BOOLEAN NOT NULL DEFAULT false,
    "contratCDI" BOOLEAN NOT NULL DEFAULT false,
    "contratCDD" BOOLEAN NOT NULL DEFAULT false,
    "contratIAE" BOOLEAN NOT NULL DEFAULT false,
    "contratLieu" TEXT,
    "projetProfessionnel" BOOLEAN NOT NULL DEFAULT false,
    "immersion" BOOLEAN NOT NULL DEFAULT false,
    "atelierRedynamisation" BOOLEAN NOT NULL DEFAULT false,
    "parentaliteEnfants" BOOLEAN NOT NULL DEFAULT false,
    "parentaliteModeGarde" BOOLEAN NOT NULL DEFAULT false,
    "partMaisonFamilles" BOOLEAN NOT NULL DEFAULT false,
    "partMaison1000Bulles" BOOLEAN NOT NULL DEFAULT false,
    "partPMI" BOOLEAN NOT NULL DEFAULT false,
    "partMissionLocale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DemarcheASID_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionCollective" (
    "id" SERIAL NOT NULL,
    "theme" "ThemeAtelier" NOT NULL,
    "themeAutre" TEXT,
    "prestataire" TEXT,
    "lieu" TEXT,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ActionCollective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipationAtelier" (
    "id" SERIAL NOT NULL,
    "actionCollectiveId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ParticipationAtelier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_personId_date_key" ON "Visit"("personId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSante_visitId_key" ON "ServiceSante"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "AccompagnementASID_fseId_key" ON "AccompagnementASID"("fseId");

-- CreateIndex
CREATE UNIQUE INDEX "DemarcheASID_accompagnementId_key" ON "DemarcheASID"("accompagnementId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationAtelier_actionCollectiveId_personId_key" ON "ParticipationAtelier"("actionCollectiveId", "personId");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSante" ADD CONSTRAINT "ServiceSante_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSante" ADD CONSTRAINT "ServiceSante_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratDeTravail" ADD CONSTRAINT "ContratDeTravail_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccompagnementFSE" ADD CONSTRAINT "AccompagnementFSE_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccompagnementFSE" ADD CONSTRAINT "AccompagnementFSE_referentId_fkey" FOREIGN KEY ("referentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccompagnementASID" ADD CONSTRAINT "AccompagnementASID_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccompagnementASID" ADD CONSTRAINT "AccompagnementASID_fseId_fkey" FOREIGN KEY ("fseId") REFERENCES "AccompagnementFSE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccompagnementASID" ADD CONSTRAINT "AccompagnementASID_referentId_fkey" FOREIGN KEY ("referentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntretienASID" ADD CONSTRAINT "EntretienASID_accompagnementId_fkey" FOREIGN KEY ("accompagnementId") REFERENCES "AccompagnementASID"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemarcheASID" ADD CONSTRAINT "DemarcheASID_accompagnementId_fkey" FOREIGN KEY ("accompagnementId") REFERENCES "AccompagnementASID"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationAtelier" ADD CONSTRAINT "ParticipationAtelier_actionCollectiveId_fkey" FOREIGN KEY ("actionCollectiveId") REFERENCES "ActionCollective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationAtelier" ADD CONSTRAINT "ParticipationAtelier_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
