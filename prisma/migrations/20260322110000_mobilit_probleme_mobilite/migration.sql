-- AlterTable: Demarches — ajout champ mobilitProblemeMobilite
ALTER TABLE "Demarches" ADD COLUMN IF NOT EXISTS "mobilitProblemeMobilite" BOOLEAN NOT NULL DEFAULT false;
