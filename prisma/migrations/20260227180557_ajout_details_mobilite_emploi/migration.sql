-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "candidatures" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "carteSolidaire" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consultationOffres" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projetProfessionnel" BOOLEAN NOT NULL DEFAULT false;
