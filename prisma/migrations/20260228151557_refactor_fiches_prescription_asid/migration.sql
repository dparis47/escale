/*
  Warnings:

  - You are about to drop the column `fichePrescription` on the `AccompagnementASID` table. All the data in the column will be lost.
  - You are about to drop the column `fichePrescriptionNom` on the `AccompagnementASID` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AccompagnementASID" DROP COLUMN "fichePrescription",
DROP COLUMN "fichePrescriptionNom";

-- CreateTable
CREATE TABLE "FichePrescriptionASID" (
    "id" SERIAL NOT NULL,
    "accompagnementId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "contenu" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FichePrescriptionASID_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FichePrescriptionASID" ADD CONSTRAINT "FichePrescriptionASID_accompagnementId_fkey" FOREIGN KEY ("accompagnementId") REFERENCES "AccompagnementASID"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
