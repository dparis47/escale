-- AlterTable
ALTER TABLE "AccompagnementASID" ADD COLUMN     "dateRenouvellement2" DATE,
ADD COLUMN     "reorientation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reorientationDescription" TEXT,
ADD COLUMN     "suiviNonRealiseRaison" TEXT;

-- AlterTable
ALTER TABLE "DemarcheASID" ADD COLUMN     "apreva" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bdiReparations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cafeCulturel109" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mdph" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nombreOffresProposees" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pass" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preparationEntretien" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "simulationEntretien" BOOLEAN NOT NULL DEFAULT false;
