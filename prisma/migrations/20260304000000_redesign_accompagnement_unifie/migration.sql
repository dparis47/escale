-- ================================================================
-- Migration : Redesign — Unification Accompagnement FSE + ASID
-- ================================================================
-- AccompagnementFSE  → Accompagnement
-- AccompagnementASID → SuiviASID (FK fseId → accompagnementId)
-- Crée AccompagnementSortie (absorbe sortie* de AccompagnementFSE + ResultatASID)
-- Demarches : fseId + asidId → accompagnementId
-- Entretien  : asidId + fseId → accompagnementId
-- FichePrescriptionASID et CvASID : accompagnementId pointe vers SuiviASID
-- ================================================================


-- ================================================================
-- ÉTAPE 1 — Renommer AccompagnementFSE → Accompagnement
-- ================================================================

ALTER TABLE "AccompagnementFSE" RENAME TO "Accompagnement";

-- Mettre à jour les indexes et contraintes renommées automatiquement par PG,
-- mais les FK vers AccompagnementFSE doivent être mises à jour manuellement.

-- Renommer la séquence si elle existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname='public' AND sequencename='AccompagnementFSE_id_seq') THEN
    ALTER SEQUENCE "AccompagnementFSE_id_seq" RENAME TO "Accompagnement_id_seq";
  END IF;
END $$;


-- ================================================================
-- ÉTAPE 2 — Renommer AccompagnementASID → SuiviASID
-- ================================================================

ALTER TABLE "AccompagnementASID" RENAME TO "SuiviASID";

-- Renommer la colonne fseId → accompagnementId dans SuiviASID
ALTER TABLE "SuiviASID" RENAME COLUMN "fseId" TO "accompagnementId";

-- Renommer la séquence si elle existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname='public' AND sequencename='AccompagnementASID_id_seq') THEN
    ALTER SEQUENCE "AccompagnementASID_id_seq" RENAME TO "SuiviASID_id_seq";
  END IF;
END $$;

-- Mettre à jour la FK de SuiviASID → Accompagnement
-- Chercher et supprimer l'ancienne contrainte FK sur fseId
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'SuiviASID'
    AND kcu.column_name = 'accompagnementId'
    AND tc.constraint_type = 'FOREIGN KEY';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "SuiviASID" DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE "SuiviASID" ADD CONSTRAINT "SuiviASID_accompagnementId_fkey"
  FOREIGN KEY ("accompagnementId") REFERENCES "Accompagnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ================================================================
-- ÉTAPE 3 — Mettre à jour FichePrescriptionASID et CvASID
-- ================================================================

-- Ces tables pointent vers AccompagnementASID (renommé SuiviASID)
-- PostgreSQL a automatiquement mis à jour les FK lors du RENAME TABLE,
-- mais il faut vérifier les noms de contraintes.

-- Rien à faire en SQL : PostgreSQL maintient les FK lors d'un RENAME TABLE.
-- Les contraintes restent valides et pointent vers la table renommée.


-- ================================================================
-- ÉTAPE 4 — Créer AccompagnementSortie
-- ================================================================

CREATE TABLE "AccompagnementSortie" (
  "id"                        SERIAL       NOT NULL,
  "accompagnementId"          INTEGER      NOT NULL,
  "sortieCDDMoins6Mois"       BOOLEAN      NOT NULL DEFAULT false,
  "sortieCDDPlus6Mois"        BOOLEAN      NOT NULL DEFAULT false,
  "sortieCDI"                 BOOLEAN      NOT NULL DEFAULT false,
  "sortieIAE"                 BOOLEAN      NOT NULL DEFAULT false,
  "sortieInterim"             BOOLEAN      NOT NULL DEFAULT false,
  "sortieIndependant"         BOOLEAN      NOT NULL DEFAULT false,
  "sortieMaintienEmploi"      BOOLEAN      NOT NULL DEFAULT false,
  "sortieRechercheEmploi"     BOOLEAN      NOT NULL DEFAULT false,
  "sortieInactif"             BOOLEAN      NOT NULL DEFAULT false,
  "sortieFormation"           BOOLEAN      NOT NULL DEFAULT false,
  "sortieCreationEntreprise"  BOOLEAN      NOT NULL DEFAULT false,
  "sortieInfoContratHorsDelai" BOOLEAN     NOT NULL DEFAULT false,
  "formationIntitule"         TEXT,
  "formationOrganisme"        TEXT,
  "formationVille"            TEXT,
  "formationDuree"            TEXT,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccompagnementSortie_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccompagnementSortie_accompagnementId_key"
  ON "AccompagnementSortie"("accompagnementId");

ALTER TABLE "AccompagnementSortie" ADD CONSTRAINT "AccompagnementSortie_accompagnementId_fkey"
  FOREIGN KEY ("accompagnementId") REFERENCES "Accompagnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ================================================================
-- ÉTAPE 5 — Migrer les données sortie depuis Accompagnement
-- ================================================================

INSERT INTO "AccompagnementSortie" (
  "accompagnementId",
  "sortieCDDMoins6Mois", "sortieCDDPlus6Mois", "sortieCDI", "sortieIAE",
  "sortieInterim", "sortieIndependant", "sortieMaintienEmploi",
  "sortieRechercheEmploi", "sortieInactif", "sortieFormation",
  "sortieCreationEntreprise", "sortieInfoContratHorsDelai",
  "formationIntitule", "formationOrganisme", "formationVille", "formationDuree"
)
SELECT
  a."id",
  a."sortieCDDMoins6Mois", a."sortieCDDPlus6Mois", a."sortieCDI", a."sortieIAE",
  FALSE,                   -- sortieInterim : sera mis à jour depuis ResultatASID
  a."sortieIndependant", a."sortieMaintienEmploi",
  a."sortieRechercheEmploi", a."sortieInactif", a."sortieFormation",
  a."sortieCreationEntreprise", a."sortieInfoContratHorsDelai",
  a."formationIntitule", a."formationOrganisme", a."formationVille", a."formationDuree"
FROM "Accompagnement" a
WHERE a."sortieCDDMoins6Mois" OR a."sortieCDDPlus6Mois" OR a."sortieCDI" OR a."sortieIAE"
  OR a."sortieIndependant" OR a."sortieMaintienEmploi" OR a."sortieRechercheEmploi"
  OR a."sortieInactif" OR a."sortieFormation" OR a."sortieCreationEntreprise"
  OR a."sortieInfoContratHorsDelai" OR a."formationIntitule" IS NOT NULL;


-- ================================================================
-- ÉTAPE 6 — Fusionner ResultatASID.contratInterim → AccompagnementSortie
-- ================================================================

-- Mettre à jour sortieInterim depuis ResultatASID pour les ASID qui ont contratInterim=true
UPDATE "AccompagnementSortie" s
SET "sortieInterim" = TRUE
FROM "ResultatASID" r
JOIN "SuiviASID" sa ON sa.id = r."accompagnementId"
WHERE s."accompagnementId" = sa."accompagnementId"
  AND r."contratInterim" = TRUE;

-- Créer une AccompagnementSortie pour les ASID qui n'avaient que des données dans ResultatASID
-- (et dont les sortie* FSE étaient tous à false, donc non insérés à l'étape 5)
INSERT INTO "AccompagnementSortie" ("accompagnementId", "sortieCDI", "sortieCDDPlus6Mois", "sortieInterim", "sortieIAE")
SELECT sa."accompagnementId",
  r."contratCDI",
  r."contratCDD",
  r."contratInterim",
  r."contratIAE"
FROM "ResultatASID" r
JOIN "SuiviASID" sa ON sa.id = r."accompagnementId"
WHERE NOT EXISTS (
  SELECT 1 FROM "AccompagnementSortie" s2
  WHERE s2."accompagnementId" = sa."accompagnementId"
)
AND (r."contratCDI" OR r."contratCDD" OR r."contratInterim" OR r."contratIAE");


-- ================================================================
-- ÉTAPE 7 — Supprimer les colonnes sortie* et formation* de Accompagnement
-- ================================================================

ALTER TABLE "Accompagnement"
  DROP COLUMN "sortieCDDMoins6Mois",
  DROP COLUMN "sortieCDDPlus6Mois",
  DROP COLUMN "sortieCDI",
  DROP COLUMN "sortieIAE",
  DROP COLUMN "sortieIndependant",
  DROP COLUMN "sortieMaintienEmploi",
  DROP COLUMN "sortieRechercheEmploi",
  DROP COLUMN "sortieInactif",
  DROP COLUMN "sortieFormation",
  DROP COLUMN "sortieCreationEntreprise",
  DROP COLUMN "sortieInfoContratHorsDelai",
  DROP COLUMN "formationIntitule",
  DROP COLUMN "formationOrganisme",
  DROP COLUMN "formationVille",
  DROP COLUMN "formationDuree";


-- ================================================================
-- ÉTAPE 8 — Mettre à jour Demarches : fseId + asidId → accompagnementId
-- ================================================================

-- Ajouter la nouvelle colonne
ALTER TABLE "Demarches" ADD COLUMN "accompagnementId" INTEGER;

-- Migrer depuis fseId (accompagnements FSE directs)
UPDATE "Demarches" d
SET "accompagnementId" = d."fseId"
WHERE d."fseId" IS NOT NULL;

-- Migrer depuis asidId (trouver l'accompagnementId via SuiviASID)
UPDATE "Demarches" d
SET "accompagnementId" = sa."accompagnementId"
FROM "SuiviASID" sa
WHERE d."asidId" = sa."id"
  AND d."accompagnementId" IS NULL;

-- Supprimer les anciennes FK et colonnes
ALTER TABLE "Demarches" DROP CONSTRAINT IF EXISTS "Demarches_fseId_fkey";
ALTER TABLE "Demarches" DROP CONSTRAINT IF EXISTS "Demarches_asidId_fkey";
ALTER TABLE "Demarches" DROP COLUMN "fseId";
ALTER TABLE "Demarches" DROP COLUMN "asidId";

-- Supprimer les anciens index uniques
DROP INDEX IF EXISTS "Demarches_fseId_key";
DROP INDEX IF EXISTS "Demarches_asidId_key";

-- Créer le nouvel index unique et la FK
CREATE UNIQUE INDEX "Demarches_accompagnementId_key" ON "Demarches"("accompagnementId");

ALTER TABLE "Demarches" ADD CONSTRAINT "Demarches_accompagnementId_fkey"
  FOREIGN KEY ("accompagnementId") REFERENCES "Accompagnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ================================================================
-- ÉTAPE 9 — Mettre à jour Entretien : asidId + fseId → accompagnementId
-- ================================================================

-- Ajouter la nouvelle colonne
ALTER TABLE "Entretien" ADD COLUMN "accompagnementId" INTEGER;

-- Migrer depuis fseId (entretiens FSE directs)
UPDATE "Entretien" e
SET "accompagnementId" = e."fseId"
WHERE e."fseId" IS NOT NULL;

-- Migrer depuis asidId (trouver l'accompagnementId via SuiviASID)
UPDATE "Entretien" e
SET "accompagnementId" = sa."accompagnementId"
FROM "SuiviASID" sa
WHERE e."asidId" = sa."id"
  AND e."accompagnementId" IS NULL;

-- Supprimer les anciennes FK et colonnes
ALTER TABLE "Entretien" DROP CONSTRAINT IF EXISTS "Entretien_asidId_fkey";
ALTER TABLE "Entretien" DROP CONSTRAINT IF EXISTS "Entretien_fseId_fkey";
ALTER TABLE "Entretien" DROP COLUMN "asidId";
ALTER TABLE "Entretien" DROP COLUMN "fseId";

-- Ajouter la nouvelle FK
ALTER TABLE "Entretien" ADD CONSTRAINT "Entretien_accompagnementId_fkey"
  FOREIGN KEY ("accompagnementId") REFERENCES "Accompagnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ================================================================
-- ÉTAPE 10 — Supprimer ResultatASID (données migrées en étapes 5+6)
-- ================================================================

ALTER TABLE "ResultatASID" DROP CONSTRAINT IF EXISTS "ResultatASID_accompagnementId_fkey";
DROP TABLE "ResultatASID";


-- ================================================================
-- ÉTAPE 11 — Mettre à jour les FK User → nouvelles tables
-- ================================================================

-- Les FK User → AccompagnementFSE et User → AccompagnementASID sont maintenant
-- automatiquement valides via les tables renommées (Accompagnement et SuiviASID).
-- Aucune action SQL requise.
