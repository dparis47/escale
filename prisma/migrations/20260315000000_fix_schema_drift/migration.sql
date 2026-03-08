-- Correction des dérives entre schema.prisma et la base de données

-- 1. Supprimer la colonne orpheline ficheInscriptionAFaire sur Visit
--    (ajoutée en migration 20260306, retirée du schema.prisma mais jamais droppée de la DB)
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "ficheInscriptionAFaire";

-- 2. Supprimer personId sur SuiviASID
--    (ajoutée en SQL direct lors du développement de l'import, absente du schema.prisma)
--    La relation Person passe par SuiviASID → Accompagnement → personId
ALTER TABLE "SuiviASID" DROP COLUMN IF EXISTS "personId";

-- 3. Formaliser estBrouillon sur Accompagnement
--    (présent dans schema.prisma et en DB via SQL direct, mais sans migration enregistrée)
ALTER TABLE "Accompagnement" ADD COLUMN IF NOT EXISTS "estBrouillon" BOOLEAN NOT NULL DEFAULT false;
