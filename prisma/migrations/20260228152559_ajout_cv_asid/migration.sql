-- CreateTable
CREATE TABLE "CvASID" (
    "id" SERIAL NOT NULL,
    "accompagnementId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "contenu" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CvASID_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CvASID" ADD CONSTRAINT "CvASID_accompagnementId_fkey" FOREIGN KEY ("accompagnementId") REFERENCES "AccompagnementASID"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
