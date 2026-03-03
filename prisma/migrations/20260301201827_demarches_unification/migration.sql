-- DropForeignKey
ALTER TABLE "DemarcheVisite" DROP CONSTRAINT "DemarcheVisite_visitId_fkey";

-- AlterTable
ALTER TABLE "DemarcheVisite" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "DemarcheVisite" ADD CONSTRAINT "DemarcheVisite_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
