-- CreateTable
CREATE TABLE "SuiviEI" (
    "id" SERIAL NOT NULL,
    "accompagnementId" INTEGER NOT NULL,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SuiviEI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvEI" (
    "id" SERIAL NOT NULL,
    "suiviEIId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "contenu" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CvEI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuiviEI_accompagnementId_key" ON "SuiviEI"("accompagnementId");

-- AddForeignKey
ALTER TABLE "SuiviEI" ADD CONSTRAINT "SuiviEI_accompagnementId_fkey" FOREIGN KEY ("accompagnementId") REFERENCES "Accompagnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvEI" ADD CONSTRAINT "CvEI_suiviEIId_fkey" FOREIGN KEY ("suiviEIId") REFERENCES "SuiviEI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
