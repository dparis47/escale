-- AlterTable: Demarches — ajout orientation partenaire sous AUTRES
ALTER TABLE "Demarches"
  ADD COLUMN IF NOT EXISTS "autresOrientationPartenaire"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autresOrientInfodroits"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autresOrientDefenseurDroits"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autresOrientFranceService"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autresOrientPrefecture"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autresOrientMissionLocale"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autresOrientCimade"            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autresOrientSosSurendettement" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autresOrientAssocCaritative"   BOOLEAN NOT NULL DEFAULT false;
