-- Migration conditionnelle : DemarcheVisite n'existe que si déjà appliquée partiellement
-- Sur base vide, cette table est créée dans 20260302000000_demarches_unification
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'DemarcheVisite'
  ) THEN
    ALTER TABLE "DemarcheVisite" DROP CONSTRAINT IF EXISTS "DemarcheVisite_visitId_fkey";
    ALTER TABLE "DemarcheVisite" ALTER COLUMN "updatedAt" DROP DEFAULT;
    ALTER TABLE "DemarcheVisite" ADD CONSTRAINT "DemarcheVisite_visitId_fkey"
      FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
