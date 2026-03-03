-- CreateEnum
CREATE TYPE "TypeContratASID" AS ENUM ('CDI', 'CDD', 'INTERIM', 'IAE');

-- AlterTable
ALTER TABLE "DemarcheASID" ADD COLUMN     "contratInterim" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ContratASID" (
    "id" SERIAL NOT NULL,
    "accompagnementId" INTEGER NOT NULL,
    "type" "TypeContratASID" NOT NULL,
    "duree" TEXT,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE,
    "employeur" TEXT,
    "poste" TEXT,
    "lieu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContratASID_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContratASID" ADD CONSTRAINT "ContratASID_accompagnementId_fkey" FOREIGN KEY ("accompagnementId") REFERENCES "AccompagnementASID"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
