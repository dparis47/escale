-- Retrait du champ referentId sur Accompagnement et SuiviASID
-- Les accompagnements ne sont plus liés à un utilisateur (référent)

ALTER TABLE "Accompagnement" DROP COLUMN IF EXISTS "referentId";
ALTER TABLE "SuiviASID" DROP COLUMN IF EXISTS "referentId";
