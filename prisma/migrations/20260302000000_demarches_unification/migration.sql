-- Migration : Unification des démarches
-- Supprime ServiceSante + MotifVisite, crée DemarcheVisite, met à jour DemarcheASID

-- ─── 1. Créer DemarcheVisite ─────────────────────────────────────────────────

CREATE TABLE "DemarcheVisite" (
  "id"                        SERIAL       PRIMARY KEY,
  "visitId"                   INTEGER      NOT NULL UNIQUE,
  -- ACCES AUX DROITS
  "droitsCafMsa"              BOOLEAN      NOT NULL DEFAULT false,
  -- EMPLOI
  "emploiRechercheEmploi"     BOOLEAN      NOT NULL DEFAULT false,
  "emploiConsultationOffres"  BOOLEAN      NOT NULL DEFAULT false,
  "emploiCandidatures"        BOOLEAN      NOT NULL DEFAULT false,
  "emploiOffresProposees"     BOOLEAN      NOT NULL DEFAULT false,
  "emploiOffresNombre"        INTEGER,
  "emploiProjetProfessionnel" BOOLEAN      NOT NULL DEFAULT false,
  "emploiProjetFormation"     BOOLEAN      NOT NULL DEFAULT false,
  "emploiCvLm"                BOOLEAN      NOT NULL DEFAULT false,
  "emploiEntretiens"          BOOLEAN      NOT NULL DEFAULT false,
  "emploiPreparationEntretien" BOOLEAN     NOT NULL DEFAULT false,
  "emploiSimulationEntretien"  BOOLEAN     NOT NULL DEFAULT false,
  "emploiEchangeFT"           BOOLEAN      NOT NULL DEFAULT false,
  "emploiInscriptionFT"       BOOLEAN      NOT NULL DEFAULT false,
  "emploiInscriptionJob47"    BOOLEAN      NOT NULL DEFAULT false,
  "emploiInscriptionInterim"  BOOLEAN      NOT NULL DEFAULT false,
  "emploiEspaceFT"            BOOLEAN      NOT NULL DEFAULT false,
  "emploiPmsmp"               BOOLEAN      NOT NULL DEFAULT false,
  -- SANTE
  "santeRendezVousPASS"       BOOLEAN      NOT NULL DEFAULT false,
  "santeCss"                  BOOLEAN      NOT NULL DEFAULT false,
  "santeCssDossier"           BOOLEAN      NOT NULL DEFAULT false,
  "santeCssOuverture"         BOOLEAN      NOT NULL DEFAULT false,
  "santeCarteVitale"          BOOLEAN      NOT NULL DEFAULT false,
  "santeAffiliation"          BOOLEAN      NOT NULL DEFAULT false,
  "santeAffiliationSecu"      BOOLEAN      NOT NULL DEFAULT false,
  "santeAffiliationMutuelle"  BOOLEAN      NOT NULL DEFAULT false,
  "santeInvalidite"           BOOLEAN      NOT NULL DEFAULT false,
  "santeRattachementEnfants"  BOOLEAN      NOT NULL DEFAULT false,
  "santeAme"                  BOOLEAN      NOT NULL DEFAULT false,
  "santeNumeriqueAmeli"       BOOLEAN      NOT NULL DEFAULT false,
  "santeNumeriqueConsultAmeli" BOOLEAN     NOT NULL DEFAULT false,
  "santeDemarchesEchangeCPAM" BOOLEAN      NOT NULL DEFAULT false,
  "santeDemarchesImpression"  BOOLEAN      NOT NULL DEFAULT false,
  "santeDemarchesInfo"        BOOLEAN      NOT NULL DEFAULT false,
  "santeAccesSoins"           BOOLEAN      NOT NULL DEFAULT false,
  "santeMdph"                 BOOLEAN      NOT NULL DEFAULT false,
  "santeSuiviSante"           BOOLEAN      NOT NULL DEFAULT false,
  "santeBilanSante"           BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientCpam"           BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientCramif"         BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientSanteTravail"   BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientMdph"           BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientPass"           BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientAddictologie"   BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientMaisonFemmes"   BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientGemCmpa"        BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientMedecins"       BOOLEAN      NOT NULL DEFAULT false,
  "santeOrientDepistage"      BOOLEAN      NOT NULL DEFAULT false,
  "santeMentale"              BOOLEAN      NOT NULL DEFAULT false,
  "santeSoutienPsy"           BOOLEAN      NOT NULL DEFAULT false,
  -- MOBILITE
  "mobilitCarteSolidaire"     BOOLEAN      NOT NULL DEFAULT false,
  "mobilitAutoEcole"          BOOLEAN      NOT NULL DEFAULT false,
  "mobilitAutoEcoleCode"      BOOLEAN      NOT NULL DEFAULT false,
  "mobilitAutoEcoleConduite"  BOOLEAN      NOT NULL DEFAULT false,
  "mobilitBdi"                BOOLEAN      NOT NULL DEFAULT false,
  "mobilitBdiPermis"          BOOLEAN      NOT NULL DEFAULT false,
  "mobilitBdiReparation"      BOOLEAN      NOT NULL DEFAULT false,
  "mobilitApreva"             BOOLEAN      NOT NULL DEFAULT false,
  "mobilitItineraire"         BOOLEAN      NOT NULL DEFAULT false,
  "mobilitMicroCredit"        BOOLEAN      NOT NULL DEFAULT false,
  "mobilitCovoiturage"        BOOLEAN      NOT NULL DEFAULT false,
  -- LOGEMENT
  "logementHabitatIndigne"    BOOLEAN      NOT NULL DEFAULT false,
  "logementDemenagement"      BOOLEAN      NOT NULL DEFAULT false,
  "logementAcces"             BOOLEAN      NOT NULL DEFAULT false,
  "logementOrientation"       BOOLEAN      NOT NULL DEFAULT false,
  "logementRecherche"         BOOLEAN      NOT NULL DEFAULT false,
  -- INCLUSION NUMERIQUE
  "numeriqueEspaceNumerique"  BOOLEAN      NOT NULL DEFAULT false,
  "numeriqueAccompagnement"   BOOLEAN      NOT NULL DEFAULT false,
  "numeriqueCoursInfo"        BOOLEAN      NOT NULL DEFAULT false,
  -- AUTRES
  "autresInfoConseil"         BOOLEAN      NOT NULL DEFAULT false,
  "autresInput"               TEXT,
  -- LUTTE CONTRE L'ISOLEMENT
  "isolementLienSocial"       BOOLEAN      NOT NULL DEFAULT false,
  -- PARENTALITE
  "parentaliteSoutien"        BOOLEAN      NOT NULL DEFAULT false,
  "parentaliteModeGarde"      BOOLEAN      NOT NULL DEFAULT false,
  "parentalitePmi"            BOOLEAN      NOT NULL DEFAULT false,
  "parentaliteMaisonFamilles" BOOLEAN      NOT NULL DEFAULT false,
  "parentaliteMaison1000"     BOOLEAN      NOT NULL DEFAULT false,
  "parentaliteCafeCulturel"   BOOLEAN      NOT NULL DEFAULT false,
  "parentaliteMissionLocale"  BOOLEAN      NOT NULL DEFAULT false,
  "parentaliteAutreInput"     TEXT,
  -- ATELIERS DE REDYNAMISATION
  "atelierParticipation"      BOOLEAN      NOT NULL DEFAULT false,
  "atelierNom"                TEXT,
  -- Métadonnées
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DemarcheVisite_visitId_fkey" FOREIGN KEY ("visitId")
    REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ─── 2. Migrer ServiceSante → DemarcheVisite ────────────────────────────────

INSERT INTO "DemarcheVisite" (
  "visitId",
  "santeCss",             -- dossierCSS
  "santeCarteVitale",     -- carteVitale
  "santeAffiliationSecu", -- affiliationDroitsSante
  "santeAffiliationMutuelle", -- affiliationMutuelle
  "santeInvalidite",      -- invalidite
  "santeRattachementEnfants", -- rattachementEnfants
  "santeAme",             -- ame
  "santeNumeriqueAmeli",  -- creationCompteAmeli
  "santeNumeriqueConsultAmeli", -- consultationAmeli
  "santeDemarchesEchangeCPAM", -- echangeCpam
  "santeDemarchesImpression",  -- impressionDocuments
  "santeDemarchesInfo",   -- informationDroits
  "santeAccesSoins",      -- demarchesAccesSoins
  "santeMdph",            -- dossierMDPH
  "santeSuiviSante",      -- suiviParcoursSoin
  "santeBilanSante",      -- bilanSante
  "santeOrientCpam",      -- orientationCpam
  "santeOrientCramif",    -- orientationCramif
  "santeOrientSanteTravail", -- orientationSanteTravail
  "santeOrientMdph",      -- orientationMDPH
  "santeOrientPass",      -- orientationPASS
  "santeOrientAddictologie", -- orientationAddictologie
  "santeOrientMaisonFemmes", -- orientationMaisonFemmes
  "santeOrientGemCmpa",   -- orientationGemCmpa
  "santeOrientMedecins",  -- orientationMedecins
  "santeOrientDepistage", -- orientationDepistage
  "santeMentale",         -- santeMentale
  "santeSoutienPsy"       -- soutienPsychologique
)
SELECT
  s."visitId",
  s."dossierCSS",
  s."carteVitale",
  s."affiliationDroitsSante",
  s."affiliationMutuelle",
  s."invalidite",
  s."rattachementEnfants",
  s."ame",
  s."creationCompteAmeli",
  s."consultationAmeli",
  s."echangeCpam",
  s."impressionDocuments",
  s."informationDroits",
  s."demarchesAccesSoins",
  s."dossierMDPH",
  s."suiviParcoursSoin",
  s."bilanSante",
  s."orientationCpam",
  s."orientationCramif",
  s."orientationSanteTravail",
  s."orientationMDPH",
  s."orientationPASS",
  s."orientationAddictologie",
  s."orientationMaisonFemmes",
  s."orientationGemCmpa",
  s."orientationMedecins",
  s."orientationDepistage",
  s."santeMentale",
  s."soutienPsychologique"
FROM "ServiceSante" s
WHERE s."visitId" IS NOT NULL AND s."deletedAt" IS NULL;

-- ─── 3. Migrer booléens Visit + autreMotif/nomAtelier → DemarcheVisite ───────

-- Pour les visites qui ont déjà un DemarcheVisite (depuis ServiceSante)
UPDATE "DemarcheVisite" dv SET
  "mobilitCarteSolidaire"    = v."carteSolidaire",
  "emploiConsultationOffres" = v."consultationOffres",
  "emploiCandidatures"       = v."candidatures",
  "emploiProjetProfessionnel" = v."projetProfessionnel",
  "autresInput"              = COALESCE(dv."autresInput", v."autreMotif"),
  "atelierNom"               = COALESCE(dv."atelierNom",  v."nomAtelier"),
  "updatedAt"                = CURRENT_TIMESTAMP
FROM "Visit" v
WHERE v."id" = dv."visitId";

-- Pour les visites sans ServiceSante mais avec des champs actifs, créer un DemarcheVisite
INSERT INTO "DemarcheVisite" (
  "visitId",
  "mobilitCarteSolidaire",
  "emploiConsultationOffres",
  "emploiCandidatures",
  "emploiProjetProfessionnel",
  "autresInput",
  "atelierNom"
)
SELECT
  v."id",
  v."carteSolidaire",
  v."consultationOffres",
  v."candidatures",
  v."projetProfessionnel",
  v."autreMotif",
  v."nomAtelier"
FROM "Visit" v
WHERE
  v."deletedAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "DemarcheVisite" dv WHERE dv."visitId" = v."id")
  AND (
    v."carteSolidaire" OR v."consultationOffres" OR v."candidatures"
    OR v."projetProfessionnel"
    OR v."autreMotif" IS NOT NULL
    OR v."nomAtelier"  IS NOT NULL
  );

-- ─── 4. Supprimer colonnes Visit + ServiceSante ──────────────────────────────

ALTER TABLE "Visit" DROP COLUMN IF EXISTS "motifs";
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "autreMotif";
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "nomAtelier";
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "carteSolidaire";
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "consultationOffres";
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "candidatures";
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "projetProfessionnel";

DROP TABLE IF EXISTS "ServiceSante";
DROP TYPE IF EXISTS "MotifVisite";

-- ─── 5. Mettre à jour DemarcheASID ───────────────────────────────────────────

-- 5a. Renommer les colonnes existantes
ALTER TABLE "DemarcheASID" RENAME COLUMN "css"              TO "santeCss";
ALTER TABLE "DemarcheASID" RENAME COLUMN "suiviSante"       TO "santeSuiviSante";
ALTER TABLE "DemarcheASID" RENAME COLUMN "bilanSante"       TO "santeBilanSante";
ALTER TABLE "DemarcheASID" RENAME COLUMN "soutienPsy"       TO "santeSoutienPsy";
ALTER TABLE "DemarcheASID" RENAME COLUMN "mdph"             TO "santeMdph";
ALTER TABLE "DemarcheASID" RENAME COLUMN "pass"             TO "santeRendezVousPASS";
ALTER TABLE "DemarcheASID" RENAME COLUMN "inscriptionAutoEcole" TO "mobilitAutoEcole";
ALTER TABLE "DemarcheASID" RENAME COLUMN "autoEcoleCode"    TO "mobilitAutoEcoleCode";
ALTER TABLE "DemarcheASID" RENAME COLUMN "autoEcoleConduite" TO "mobilitAutoEcoleConduite";
ALTER TABLE "DemarcheASID" RENAME COLUMN "carteSolidaire"   TO "mobilitCarteSolidaire";
ALTER TABLE "DemarcheASID" RENAME COLUMN "apreva"           TO "mobilitApreva";
ALTER TABLE "DemarcheASID" RENAME COLUMN "bdiPermis"        TO "mobilitBdiPermis";
ALTER TABLE "DemarcheASID" RENAME COLUMN "bdiReparations"   TO "mobilitBdiReparation";
ALTER TABLE "DemarcheASID" RENAME COLUMN "habitatIndigne"   TO "logementHabitatIndigne";
ALTER TABLE "DemarcheASID" RENAME COLUMN "demenagementsAcces" TO "logementAcces";
ALTER TABLE "DemarcheASID" RENAME COLUMN "rechercheEmploi"  TO "emploiRechercheEmploi";
ALTER TABLE "DemarcheASID" RENAME COLUMN "cvLm"             TO "emploiCvLm";
ALTER TABLE "DemarcheASID" RENAME COLUMN "offresProposees"  TO "emploiOffresProposees";
ALTER TABLE "DemarcheASID" RENAME COLUMN "nombreOffresProposees" TO "emploiOffresNombre";
ALTER TABLE "DemarcheASID" RENAME COLUMN "entretiens"       TO "emploiEntretiens";
ALTER TABLE "DemarcheASID" RENAME COLUMN "preparationEntretien" TO "emploiPreparationEntretien";
ALTER TABLE "DemarcheASID" RENAME COLUMN "simulationEntretien" TO "emploiSimulationEntretien";
ALTER TABLE "DemarcheASID" RENAME COLUMN "projetProfessionnel" TO "emploiProjetProfessionnel";
ALTER TABLE "DemarcheASID" RENAME COLUMN "immersion"        TO "emploiPmsmp";
ALTER TABLE "DemarcheASID" RENAME COLUMN "atelierRedynamisation" TO "atelierParticipation";
ALTER TABLE "DemarcheASID" RENAME COLUMN "parentaliteEnfants" TO "parentaliteSoutien";
ALTER TABLE "DemarcheASID" RENAME COLUMN "partMaisonFamilles"  TO "parentaliteMaisonFamilles";
ALTER TABLE "DemarcheASID" RENAME COLUMN "partMaison1000Bulles" TO "parentaliteMaison1000";
ALTER TABLE "DemarcheASID" RENAME COLUMN "partPMI"          TO "parentalitePmi";
ALTER TABLE "DemarcheASID" RENAME COLUMN "cafeCulturel109"  TO "parentaliteCafeCulturel";
ALTER TABLE "DemarcheASID" RENAME COLUMN "partMissionLocale" TO "parentaliteMissionLocale";

-- 5b. Fusionner bdiVoiture dans mobilitBdi puis supprimer
ALTER TABLE "DemarcheASID" ADD COLUMN "mobilitBdi" BOOLEAN NOT NULL DEFAULT false;
UPDATE "DemarcheASID" SET "mobilitBdi" = ("bdiVoiture" OR "mobilitBdiPermis" OR "mobilitBdiReparation");
ALTER TABLE "DemarcheASID" DROP COLUMN "bdiVoiture";

-- 5c. Supprimer les colonnes obsolètes
ALTER TABLE "DemarcheASID" DROP COLUMN "permisObtenu";
ALTER TABLE "DemarcheASID" DROP COLUMN "vehiculeDisponible";
ALTER TABLE "DemarcheASID" DROP COLUMN "etatVehicule";
ALTER TABLE "DemarcheASID" DROP COLUMN "contratLieu";

-- 5d. Modifier emploiOffresNombre : INT DEFAULT 0 → INT NULL
ALTER TABLE "DemarcheASID" ALTER COLUMN "emploiOffresNombre" DROP DEFAULT;
ALTER TABLE "DemarcheASID" ALTER COLUMN "emploiOffresNombre" DROP NOT NULL;
UPDATE "DemarcheASID" SET "emploiOffresNombre" = NULL WHERE "emploiOffresNombre" = 0;

-- 5e. Ajouter tous les nouveaux champs
ALTER TABLE "DemarcheASID" ADD COLUMN "droitsCafMsa"              BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "emploiConsultationOffres"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "emploiCandidatures"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "emploiProjetFormation"      BOOLEAN NOT NULL DEFAULT false;
-- emploiPreparationEntretien et emploiSimulationEntretien sont déjà renommés en 5a
ALTER TABLE "DemarcheASID" ADD COLUMN "emploiEchangeFT"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "emploiInscriptionFT"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "emploiInscriptionJob47"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "emploiInscriptionInterim"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "emploiEspaceFT"             BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeCssDossier"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeCssOuverture"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeCarteVitale"           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeAffiliation"           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeAffiliationSecu"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeAffiliationMutuelle"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeInvalidite"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeRattachementEnfants"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeAme"                   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeNumeriqueAmeli"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeNumeriqueConsultAmeli" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeDemarchesEchangeCPAM"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeDemarchesImpression"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeDemarchesInfo"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeAccesSoins"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientCpam"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientCramif"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientSanteTravail"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientMdph"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientPass"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientAddictologie"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientMaisonFemmes"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientGemCmpa"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientMedecins"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeOrientDepistage"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "santeMentale"               BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "mobilitItineraire"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "mobilitMicroCredit"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "mobilitCovoiturage"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "logementDemenagement"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "logementOrientation"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "logementRecherche"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "numeriqueEspaceNumerique"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "numeriqueAccompagnement"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "numeriqueCoursInfo"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "autresInfoConseil"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "autresInput"                TEXT;
ALTER TABLE "DemarcheASID" ADD COLUMN "isolementLienSocial"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DemarcheASID" ADD COLUMN "parentaliteAutreInput"      TEXT;
ALTER TABLE "DemarcheASID" ADD COLUMN "atelierNom"                 TEXT;
