-- Migration : atelierNom String? → atelierNoms String[]
ALTER TABLE "Demarches" ADD COLUMN "atelierNoms" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "Demarches" SET "atelierNoms" = ARRAY["atelierNom"] WHERE "atelierNom" IS NOT NULL;
ALTER TABLE "Demarches" DROP COLUMN "atelierNom";
