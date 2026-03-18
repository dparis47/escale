-- Supprimer les anciens champs ressources
ALTER TABLE "AccompagnementFSE" DROP COLUMN IF EXISTS "ressourceSalaireConjoint";
ALTER TABLE "AccompagnementFSE" DROP COLUMN IF EXISTS "ressourceInvalidite";
ALTER TABLE "AccompagnementFSE" DROP COLUMN IF EXISTS "rsaDateEntree";
ALTER TABLE "AccompagnementFSE" DROP COLUMN IF EXISTS "rsaDateSortie";

-- Supprimer les anciens champs emploi avant FSE qui seront remplacés
-- (on garde avantCDI, avantCDDPlus6Mois, avantCDDMoins6Mois, avantIAE, avantIndependant)

-- Ajouter le nouvel enum NiveauFormation
CREATE TYPE "NiveauFormation" AS ENUM ('PAS_SCOLARISE', 'PRIMAIRE_3EME', 'CAP_BAC', 'DEUG_PLUS');

-- Ajouter les nouveaux champs ressources
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "ressourceASI" BOOLEAN NOT NULL DEFAULT false;

-- Ajouter les nouveaux champs emploi avant FSE
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "avantOccupeEmploi"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "avantInterim"             BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "avantFormationPro"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "avantEnRechercheEmploi"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "avantNeCherchePasEmploi"  BOOLEAN NOT NULL DEFAULT false;

-- Ajouter les nouveaux champs
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "niveauFormation"         "NiveauFormation";
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "reconnaissanceHandicap"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "logementSDF"             BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AccompagnementFSE" ADD COLUMN IF NOT EXISTS "logementExclusion"       BOOLEAN NOT NULL DEFAULT false;
