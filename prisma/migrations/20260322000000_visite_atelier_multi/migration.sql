-- CreateTable: VisiteAtelier (plusieurs ateliers par visite)
CREATE TABLE "VisiteAtelier" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "actionCollectiveId" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VisiteAtelier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisiteAtelier_visitId_actionCollectiveId_key" ON "VisiteAtelier"("visitId", "actionCollectiveId");

-- AddForeignKey
ALTER TABLE "VisiteAtelier" ADD CONSTRAINT "VisiteAtelier_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisiteAtelier" ADD CONSTRAINT "VisiteAtelier_actionCollectiveId_fkey" FOREIGN KEY ("actionCollectiveId") REFERENCES "ActionCollective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration des données existantes : déplacer Demarches.actionCollectiveId vers VisiteAtelier
-- Conditionnel : la colonne a pu être supprimée par une migration précédente sur base existante
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'Demarches'
      AND column_name  = 'actionCollectiveId'
  ) THEN
    INSERT INTO "VisiteAtelier" ("visitId", "actionCollectiveId")
    SELECT v.id, d."actionCollectiveId"
    FROM "Visit" v
    JOIN "Demarches" d ON d."visitId" = v.id
    WHERE d."actionCollectiveId" IS NOT NULL
      AND v."deletedAt" IS NULL;
  END IF;
END $$;

-- RemoveForeignKey
ALTER TABLE "Demarches" DROP CONSTRAINT IF EXISTS "Demarches_actionCollectiveId_fkey";

-- AlterTable: supprimer la colonne actionCollectiveId de Demarches
ALTER TABLE "Demarches" DROP COLUMN IF EXISTS "actionCollectiveId";
