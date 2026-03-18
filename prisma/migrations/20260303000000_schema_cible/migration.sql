-- ================================================================
-- Migration : Schéma cible — Person centrale + Demarches unifiées
-- ================================================================
-- Stratégie :
-- 1. Ajouter Person.estInscrit (toutes les Person existantes → true)
-- 2. Créer une Person minimale pour chaque visite "sans fiche" (estInscrit=false)
-- 3. Rendre Visit.personId NOT NULL, supprimer genre/nom/prenom de Visit
-- 4. Supprimer les 12 champs demarcheXxx inline de AccompagnementFSE
-- 5. Créer la table Demarches (unifiée) et migrer DemarcheVisite + DemarcheASID
-- 6. Créer ResultatASID et migrer les 4 contrats depuis DemarcheASID
-- 7. Créer la table Entretien et migrer EntretienASID (asidId = accompagnementId)
-- 8. Ajouter les FK constraints + indexes
-- 9. Supprimer les anciennes tables et l'ancien enum


-- ================================================================
-- ÉTAPE 1 — Person.estInscrit
-- ================================================================

ALTER TABLE "Person" ADD COLUMN "estInscrit" BOOLEAN NOT NULL DEFAULT false;

-- Toutes les Person existantes sont des fiches complètes (estInscrit = true)
UPDATE "Person" SET "estInscrit" = true;


-- ================================================================
-- ÉTAPE 2 — Créer une Person par visite sans fiche
-- ================================================================

DO $$
DECLARE
  v RECORD;
  new_person_id INT;
BEGIN
  FOR v IN
    SELECT id,
           COALESCE(nom, 'ANONYME') AS nom,
           COALESCE(prenom, '')     AS prenom,
           genre
    FROM "Visit"
    WHERE "personId" IS NULL
  LOOP
    INSERT INTO "Person" (nom, prenom, genre, "estInscrit", "createdAt", "updatedAt")
    VALUES (v.nom, v.prenom, v.genre, false, NOW(), NOW())
    RETURNING id INTO new_person_id;

    UPDATE "Visit" SET "personId" = new_person_id WHERE id = v.id;
  END LOOP;
END $$;


-- ================================================================
-- ÉTAPE 3 — Visit : rendre personId NOT NULL, supprimer genre/nom/prenom
-- ================================================================

-- Supprimer l'ancienne FK nullable
ALTER TABLE "Visit" DROP CONSTRAINT "Visit_personId_fkey";

-- Supprimer les colonnes obsolètes
ALTER TABLE "Visit"
  DROP COLUMN "genre",
  DROP COLUMN "nom",
  DROP COLUMN "prenom";

-- Rendre personId NOT NULL
ALTER TABLE "Visit" ALTER COLUMN "personId" SET NOT NULL;

-- Recréer la FK non-nullable
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ================================================================
-- ÉTAPE 4 — AccompagnementFSE : supprimer les 12 champs demarcheXxx inline
-- ================================================================

ALTER TABLE "AccompagnementFSE"
  DROP COLUMN "demarcheAteliers",
  DROP COLUMN "demarcheBilanSante",
  DROP COLUMN "demarcheCSS",
  DROP COLUMN "demarcheCV",
  DROP COLUMN "demarcheDroitsCAF",
  DROP COLUMN "demarcheLogement",
  DROP COLUMN "demarcheMobilite",
  DROP COLUMN "demarcheNumerique",
  DROP COLUMN "demarcheParentalite",
  DROP COLUMN "demarchePassNumerique",
  DROP COLUMN "demarcheRechercheEmploi",
  DROP COLUMN "demarcheSante";


-- ================================================================
-- ÉTAPE 5 — Créer la table Demarches unifiée
-- ================================================================

CREATE TABLE "Demarches" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER,
    "fseId"   INTEGER,
    "asidId"  INTEGER,
    -- ACCES AUX DROITS
    "droitsCafMsa"               BOOLEAN NOT NULL DEFAULT false,
    -- EMPLOI
    "emploiRechercheEmploi"      BOOLEAN NOT NULL DEFAULT false,
    "emploiConsultationOffres"   BOOLEAN NOT NULL DEFAULT false,
    "emploiCandidatures"         BOOLEAN NOT NULL DEFAULT false,
    "emploiOffresProposees"      BOOLEAN NOT NULL DEFAULT false,
    "emploiOffresNombre"         INTEGER,
    "emploiProjetProfessionnel"  BOOLEAN NOT NULL DEFAULT false,
    "emploiProjetFormation"      BOOLEAN NOT NULL DEFAULT false,
    "emploiCvLm"                 BOOLEAN NOT NULL DEFAULT false,
    "emploiEntretiens"           BOOLEAN NOT NULL DEFAULT false,
    "emploiPreparationEntretien" BOOLEAN NOT NULL DEFAULT false,
    "emploiSimulationEntretien"  BOOLEAN NOT NULL DEFAULT false,
    "emploiEchangeFT"            BOOLEAN NOT NULL DEFAULT false,
    "emploiInscriptionFT"        BOOLEAN NOT NULL DEFAULT false,
    "emploiInscriptionJob47"     BOOLEAN NOT NULL DEFAULT false,
    "emploiInscriptionInterim"   BOOLEAN NOT NULL DEFAULT false,
    "emploiEspaceFT"             BOOLEAN NOT NULL DEFAULT false,
    "emploiPmsmp"                BOOLEAN NOT NULL DEFAULT false,
    -- SANTE
    "santeRendezVousPASS"        BOOLEAN NOT NULL DEFAULT false,
    "santeCss"                   BOOLEAN NOT NULL DEFAULT false,
    "santeCssDossier"            BOOLEAN NOT NULL DEFAULT false,
    "santeCssOuverture"          BOOLEAN NOT NULL DEFAULT false,
    "santeCarteVitale"           BOOLEAN NOT NULL DEFAULT false,
    "santeAffiliation"           BOOLEAN NOT NULL DEFAULT false,
    "santeAffiliationSecu"       BOOLEAN NOT NULL DEFAULT false,
    "santeAffiliationMutuelle"   BOOLEAN NOT NULL DEFAULT false,
    "santeInvalidite"            BOOLEAN NOT NULL DEFAULT false,
    "santeRattachementEnfants"   BOOLEAN NOT NULL DEFAULT false,
    "santeAme"                   BOOLEAN NOT NULL DEFAULT false,
    "santeNumeriqueAmeli"        BOOLEAN NOT NULL DEFAULT false,
    "santeNumeriqueConsultAmeli" BOOLEAN NOT NULL DEFAULT false,
    "santeDemarchesEchangeCPAM"  BOOLEAN NOT NULL DEFAULT false,
    "santeDemarchesImpression"   BOOLEAN NOT NULL DEFAULT false,
    "santeDemarchesInfo"         BOOLEAN NOT NULL DEFAULT false,
    "santeAccesSoins"            BOOLEAN NOT NULL DEFAULT false,
    "santeMdph"                  BOOLEAN NOT NULL DEFAULT false,
    "santeSuiviSante"            BOOLEAN NOT NULL DEFAULT false,
    "santeBilanSante"            BOOLEAN NOT NULL DEFAULT false,
    "santeOrientCpam"            BOOLEAN NOT NULL DEFAULT false,
    "santeOrientCramif"          BOOLEAN NOT NULL DEFAULT false,
    "santeOrientSanteTravail"    BOOLEAN NOT NULL DEFAULT false,
    "santeOrientMdph"            BOOLEAN NOT NULL DEFAULT false,
    "santeOrientPass"            BOOLEAN NOT NULL DEFAULT false,
    "santeOrientAddictologie"    BOOLEAN NOT NULL DEFAULT false,
    "santeOrientMaisonFemmes"    BOOLEAN NOT NULL DEFAULT false,
    "santeOrientGemCmpa"         BOOLEAN NOT NULL DEFAULT false,
    "santeOrientMedecins"        BOOLEAN NOT NULL DEFAULT false,
    "santeOrientDepistage"       BOOLEAN NOT NULL DEFAULT false,
    "santeMentale"               BOOLEAN NOT NULL DEFAULT false,
    "santeSoutienPsy"            BOOLEAN NOT NULL DEFAULT false,
    -- MOBILITE
    "mobilitCarteSolidaire"      BOOLEAN NOT NULL DEFAULT false,
    "mobilitAutoEcole"           BOOLEAN NOT NULL DEFAULT false,
    "mobilitAutoEcoleCode"       BOOLEAN NOT NULL DEFAULT false,
    "mobilitAutoEcoleConduite"   BOOLEAN NOT NULL DEFAULT false,
    "mobilitBdi"                 BOOLEAN NOT NULL DEFAULT false,
    "mobilitBdiPermis"           BOOLEAN NOT NULL DEFAULT false,
    "mobilitBdiReparation"       BOOLEAN NOT NULL DEFAULT false,
    "mobilitApreva"              BOOLEAN NOT NULL DEFAULT false,
    "mobilitItineraire"          BOOLEAN NOT NULL DEFAULT false,
    "mobilitMicroCredit"         BOOLEAN NOT NULL DEFAULT false,
    "mobilitCovoiturage"         BOOLEAN NOT NULL DEFAULT false,
    -- LOGEMENT
    "logementHabitatIndigne"     BOOLEAN NOT NULL DEFAULT false,
    "logementDemenagement"       BOOLEAN NOT NULL DEFAULT false,
    "logementAcces"              BOOLEAN NOT NULL DEFAULT false,
    "logementOrientation"        BOOLEAN NOT NULL DEFAULT false,
    "logementRecherche"          BOOLEAN NOT NULL DEFAULT false,
    -- INCLUSION NUMERIQUE
    "numeriqueEspaceNumerique"   BOOLEAN NOT NULL DEFAULT false,
    "numeriqueAccompagnement"    BOOLEAN NOT NULL DEFAULT false,
    "numeriqueCoursInfo"         BOOLEAN NOT NULL DEFAULT false,
    -- AUTRES
    "autresInfoConseil"          BOOLEAN NOT NULL DEFAULT false,
    "autresInput"                TEXT,
    -- LUTTE CONTRE L'ISOLEMENT
    "isolementLienSocial"        BOOLEAN NOT NULL DEFAULT false,
    -- PARENTALITE
    "parentaliteSoutien"         BOOLEAN NOT NULL DEFAULT false,
    "parentaliteModeGarde"       BOOLEAN NOT NULL DEFAULT false,
    "parentalitePmi"             BOOLEAN NOT NULL DEFAULT false,
    "parentaliteMaisonFamilles"  BOOLEAN NOT NULL DEFAULT false,
    "parentaliteMaison1000"      BOOLEAN NOT NULL DEFAULT false,
    "parentaliteCafeCulturel"    BOOLEAN NOT NULL DEFAULT false,
    "parentaliteMissionLocale"   BOOLEAN NOT NULL DEFAULT false,
    "parentaliteAutreInput"      TEXT,
    -- ATELIERS DE REDYNAMISATION
    "atelierParticipation"       BOOLEAN NOT NULL DEFAULT false,
    "atelierNom"                 TEXT,
    -- TIMESTAMPS
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Demarches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Demarches_visitId_key" ON "Demarches"("visitId");
CREATE UNIQUE INDEX "Demarches_fseId_key"   ON "Demarches"("fseId");
CREATE UNIQUE INDEX "Demarches_asidId_key"  ON "Demarches"("asidId");


-- ================================================================
-- ÉTAPE 5b — Migrer DemarcheVisite → Demarches (visitId)
-- ================================================================

INSERT INTO "Demarches" (
    "visitId",
    "droitsCafMsa",
    "emploiRechercheEmploi", "emploiConsultationOffres", "emploiCandidatures",
    "emploiOffresProposees", "emploiOffresNombre", "emploiProjetProfessionnel",
    "emploiProjetFormation", "emploiCvLm", "emploiEntretiens",
    "emploiPreparationEntretien", "emploiSimulationEntretien",
    "emploiEchangeFT", "emploiInscriptionFT", "emploiInscriptionJob47",
    "emploiInscriptionInterim", "emploiEspaceFT", "emploiPmsmp",
    "santeRendezVousPASS", "santeCss", "santeCssDossier", "santeCssOuverture",
    "santeCarteVitale", "santeAffiliation", "santeAffiliationSecu",
    "santeAffiliationMutuelle", "santeInvalidite", "santeRattachementEnfants",
    "santeAme", "santeNumeriqueAmeli", "santeNumeriqueConsultAmeli",
    "santeDemarchesEchangeCPAM", "santeDemarchesImpression", "santeDemarchesInfo",
    "santeAccesSoins", "santeMdph", "santeSuiviSante", "santeBilanSante",
    "santeOrientCpam", "santeOrientCramif", "santeOrientSanteTravail",
    "santeOrientMdph", "santeOrientPass", "santeOrientAddictologie",
    "santeOrientMaisonFemmes", "santeOrientGemCmpa", "santeOrientMedecins",
    "santeOrientDepistage", "santeMentale", "santeSoutienPsy",
    "mobilitCarteSolidaire", "mobilitAutoEcole", "mobilitAutoEcoleCode",
    "mobilitAutoEcoleConduite", "mobilitBdi", "mobilitBdiPermis",
    "mobilitBdiReparation", "mobilitApreva", "mobilitItineraire",
    "mobilitMicroCredit", "mobilitCovoiturage",
    "logementHabitatIndigne", "logementDemenagement", "logementAcces",
    "logementOrientation", "logementRecherche",
    "numeriqueEspaceNumerique", "numeriqueAccompagnement", "numeriqueCoursInfo",
    "autresInfoConseil", "autresInput",
    "isolementLienSocial",
    "parentaliteSoutien", "parentaliteModeGarde", "parentalitePmi",
    "parentaliteMaisonFamilles", "parentaliteMaison1000", "parentaliteCafeCulturel",
    "parentaliteMissionLocale", "parentaliteAutreInput",
    "atelierParticipation", "atelierNom",
    "createdAt", "updatedAt"
)
SELECT
    "visitId",
    "droitsCafMsa",
    "emploiRechercheEmploi", "emploiConsultationOffres", "emploiCandidatures",
    "emploiOffresProposees", "emploiOffresNombre", "emploiProjetProfessionnel",
    "emploiProjetFormation", "emploiCvLm", "emploiEntretiens",
    "emploiPreparationEntretien", "emploiSimulationEntretien",
    "emploiEchangeFT", "emploiInscriptionFT", "emploiInscriptionJob47",
    "emploiInscriptionInterim", "emploiEspaceFT", "emploiPmsmp",
    "santeRendezVousPASS", "santeCss", "santeCssDossier", "santeCssOuverture",
    "santeCarteVitale", "santeAffiliation", "santeAffiliationSecu",
    "santeAffiliationMutuelle", "santeInvalidite", "santeRattachementEnfants",
    "santeAme", "santeNumeriqueAmeli", "santeNumeriqueConsultAmeli",
    "santeDemarchesEchangeCPAM", "santeDemarchesImpression", "santeDemarchesInfo",
    "santeAccesSoins", "santeMdph", "santeSuiviSante", "santeBilanSante",
    "santeOrientCpam", "santeOrientCramif", "santeOrientSanteTravail",
    "santeOrientMdph", "santeOrientPass", "santeOrientAddictologie",
    "santeOrientMaisonFemmes", "santeOrientGemCmpa", "santeOrientMedecins",
    "santeOrientDepistage", "santeMentale", "santeSoutienPsy",
    "mobilitCarteSolidaire", "mobilitAutoEcole", "mobilitAutoEcoleCode",
    "mobilitAutoEcoleConduite", "mobilitBdi", "mobilitBdiPermis",
    "mobilitBdiReparation", "mobilitApreva", "mobilitItineraire",
    "mobilitMicroCredit", "mobilitCovoiturage",
    "logementHabitatIndigne", "logementDemenagement", "logementAcces",
    "logementOrientation", "logementRecherche",
    "numeriqueEspaceNumerique", "numeriqueAccompagnement", "numeriqueCoursInfo",
    "autresInfoConseil", "autresInput",
    "isolementLienSocial",
    "parentaliteSoutien", "parentaliteModeGarde", "parentalitePmi",
    "parentaliteMaisonFamilles", "parentaliteMaison1000", "parentaliteCafeCulturel",
    "parentaliteMissionLocale", "parentaliteAutreInput",
    "atelierParticipation", "atelierNom",
    "createdAt", "updatedAt"
FROM "DemarcheVisite";

-- Créer une Demarches vide pour chaque visite non-supprimée sans DemarcheVisite
INSERT INTO "Demarches" ("visitId", "createdAt", "updatedAt")
SELECT v.id, NOW(), NOW()
FROM "Visit" v
WHERE v."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Demarches" d WHERE d."visitId" = v.id
  );


-- ================================================================
-- ÉTAPE 5c — Migrer DemarcheASID → Demarches (asidId)
-- ================================================================

INSERT INTO "Demarches" (
    "asidId",
    "droitsCafMsa",
    "emploiRechercheEmploi", "emploiConsultationOffres", "emploiCandidatures",
    "emploiOffresProposees", "emploiOffresNombre", "emploiProjetProfessionnel",
    "emploiProjetFormation", "emploiCvLm", "emploiEntretiens",
    "emploiPreparationEntretien", "emploiSimulationEntretien",
    "emploiEchangeFT", "emploiInscriptionFT", "emploiInscriptionJob47",
    "emploiInscriptionInterim", "emploiEspaceFT", "emploiPmsmp",
    "santeRendezVousPASS", "santeCss", "santeCssDossier", "santeCssOuverture",
    "santeCarteVitale", "santeAffiliation", "santeAffiliationSecu",
    "santeAffiliationMutuelle", "santeInvalidite", "santeRattachementEnfants",
    "santeAme", "santeNumeriqueAmeli", "santeNumeriqueConsultAmeli",
    "santeDemarchesEchangeCPAM", "santeDemarchesImpression", "santeDemarchesInfo",
    "santeAccesSoins", "santeMdph", "santeSuiviSante", "santeBilanSante",
    "santeOrientCpam", "santeOrientCramif", "santeOrientSanteTravail",
    "santeOrientMdph", "santeOrientPass", "santeOrientAddictologie",
    "santeOrientMaisonFemmes", "santeOrientGemCmpa", "santeOrientMedecins",
    "santeOrientDepistage", "santeMentale", "santeSoutienPsy",
    "mobilitCarteSolidaire", "mobilitAutoEcole", "mobilitAutoEcoleCode",
    "mobilitAutoEcoleConduite", "mobilitBdi", "mobilitBdiPermis",
    "mobilitBdiReparation", "mobilitApreva", "mobilitItineraire",
    "mobilitMicroCredit", "mobilitCovoiturage",
    "logementHabitatIndigne", "logementDemenagement", "logementAcces",
    "logementOrientation", "logementRecherche",
    "numeriqueEspaceNumerique", "numeriqueAccompagnement", "numeriqueCoursInfo",
    "autresInfoConseil", "autresInput",
    "isolementLienSocial",
    "parentaliteSoutien", "parentaliteModeGarde", "parentalitePmi",
    "parentaliteMaisonFamilles", "parentaliteMaison1000", "parentaliteCafeCulturel",
    "parentaliteMissionLocale", "parentaliteAutreInput",
    "atelierParticipation", "atelierNom",
    "createdAt", "updatedAt"
)
SELECT
    "accompagnementId",
    "droitsCafMsa",
    "emploiRechercheEmploi", "emploiConsultationOffres", "emploiCandidatures",
    "emploiOffresProposees", "emploiOffresNombre", "emploiProjetProfessionnel",
    "emploiProjetFormation", "emploiCvLm", "emploiEntretiens",
    "emploiPreparationEntretien", "emploiSimulationEntretien",
    "emploiEchangeFT", "emploiInscriptionFT", "emploiInscriptionJob47",
    "emploiInscriptionInterim", "emploiEspaceFT", "emploiPmsmp",
    "santeRendezVousPASS", "santeCss", "santeCssDossier", "santeCssOuverture",
    "santeCarteVitale", "santeAffiliation", "santeAffiliationSecu",
    "santeAffiliationMutuelle", "santeInvalidite", "santeRattachementEnfants",
    "santeAme", "santeNumeriqueAmeli", "santeNumeriqueConsultAmeli",
    "santeDemarchesEchangeCPAM", "santeDemarchesImpression", "santeDemarchesInfo",
    "santeAccesSoins", "santeMdph", "santeSuiviSante", "santeBilanSante",
    "santeOrientCpam", "santeOrientCramif", "santeOrientSanteTravail",
    "santeOrientMdph", "santeOrientPass", "santeOrientAddictologie",
    "santeOrientMaisonFemmes", "santeOrientGemCmpa", "santeOrientMedecins",
    "santeOrientDepistage", "santeMentale", "santeSoutienPsy",
    "mobilitCarteSolidaire", "mobilitAutoEcole", "mobilitAutoEcoleCode",
    "mobilitAutoEcoleConduite", "mobilitBdi", "mobilitBdiPermis",
    "mobilitBdiReparation", "mobilitApreva", "mobilitItineraire",
    "mobilitMicroCredit", "mobilitCovoiturage",
    "logementHabitatIndigne", "logementDemenagement", "logementAcces",
    "logementOrientation", "logementRecherche",
    "numeriqueEspaceNumerique", "numeriqueAccompagnement", "numeriqueCoursInfo",
    "autresInfoConseil", "autresInput",
    "isolementLienSocial",
    "parentaliteSoutien", "parentaliteModeGarde", "parentalitePmi",
    "parentaliteMaisonFamilles", "parentaliteMaison1000", "parentaliteCafeCulturel",
    "parentaliteMissionLocale", "parentaliteAutreInput",
    "atelierParticipation", "atelierNom",
    "createdAt", "updatedAt"
FROM "DemarcheASID";


-- ================================================================
-- ÉTAPE 6 — Créer ResultatASID et migrer les contrats depuis DemarcheASID
-- ================================================================

CREATE TABLE "ResultatASID" (
    "id"               SERIAL       NOT NULL,
    "accompagnementId" INTEGER      NOT NULL,
    "contratCDI"       BOOLEAN      NOT NULL DEFAULT false,
    "contratCDD"       BOOLEAN      NOT NULL DEFAULT false,
    "contratInterim"   BOOLEAN      NOT NULL DEFAULT false,
    "contratIAE"       BOOLEAN      NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultatASID_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResultatASID_accompagnementId_key" ON "ResultatASID"("accompagnementId");

INSERT INTO "ResultatASID"
    ("accompagnementId", "contratCDI", "contratCDD", "contratInterim", "contratIAE", "createdAt", "updatedAt")
SELECT
    "accompagnementId", "contratCDI", "contratCDD", "contratInterim", "contratIAE", NOW(), NOW()
FROM "DemarcheASID";


-- ================================================================
-- ÉTAPE 7 — Créer Entretien et migrer EntretienASID
-- ================================================================

-- Nouvel enum (mêmes valeurs, nouveau nom)
CREATE TYPE "SujetEntretien" AS ENUM (
    'SANTE', 'MOBILITE', 'EMPLOI', 'LOGEMENT', 'ATELIER_REDYNAMISATION', 'PARENTALITE'
);

CREATE TABLE "Entretien" (
    "id"        SERIAL       NOT NULL,
    "asidId"    INTEGER,
    "fseId"     INTEGER,
    "date"      DATE         NOT NULL,
    "sujets"    "SujetEntretien"[],
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Entretien_pkey" PRIMARY KEY ("id")
);

-- Migrer EntretienASID → Entretien (accompagnementId devient asidId)
-- Le cast text[]::SujetEntretien[] fonctionne car les valeurs sont identiques
INSERT INTO "Entretien" ("asidId", "date", "sujets", "notes", "createdAt", "updatedAt", "deletedAt")
SELECT
    "accompagnementId",
    "date",
    ARRAY(SELECT unnest("sujets")::text::"SujetEntretien"),
    "notes",
    "createdAt",
    "updatedAt",
    "deletedAt"
FROM "EntretienASID";


-- ================================================================
-- ÉTAPE 8 — FK constraints sur les nouvelles tables
-- ================================================================

ALTER TABLE "Demarches" ADD CONSTRAINT "Demarches_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Demarches" ADD CONSTRAINT "Demarches_fseId_fkey"
    FOREIGN KEY ("fseId") REFERENCES "AccompagnementFSE"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Demarches" ADD CONSTRAINT "Demarches_asidId_fkey"
    FOREIGN KEY ("asidId") REFERENCES "AccompagnementASID"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResultatASID" ADD CONSTRAINT "ResultatASID_accompagnementId_fkey"
    FOREIGN KEY ("accompagnementId") REFERENCES "AccompagnementASID"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Entretien" ADD CONSTRAINT "Entretien_asidId_fkey"
    FOREIGN KEY ("asidId") REFERENCES "AccompagnementASID"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Entretien" ADD CONSTRAINT "Entretien_fseId_fkey"
    FOREIGN KEY ("fseId") REFERENCES "AccompagnementFSE"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ================================================================
-- ÉTAPE 9 — Supprimer les anciens FK, tables et enum
-- ================================================================

ALTER TABLE "DemarcheASID"  DROP CONSTRAINT "DemarcheASID_accompagnementId_fkey";
ALTER TABLE "DemarcheVisite" DROP CONSTRAINT "DemarcheVisite_visitId_fkey";
ALTER TABLE "EntretienASID"  DROP CONSTRAINT "EntretienASID_accompagnementId_fkey";

DROP TABLE "DemarcheASID";
DROP TABLE "DemarcheVisite";
DROP TABLE "EntretienASID";

DROP TYPE "SujetEntretienASID";
