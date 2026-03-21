-- Correction de la dérive de schéma (schema drift)

-- AlterEnum : ajouter le rôle ADMIN
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';

-- DropIndex (conditionnel)
DROP INDEX IF EXISTS "FichierEmargement_actionCollectiveId_idx";

-- Accompagnement : renommer la contrainte PK (instruction séparée obligatoire)
ALTER TABLE "Accompagnement" RENAME CONSTRAINT "AccompagnementFSE_pkey" TO "Accompagnement_pkey";

-- Accompagnement : ajouter les colonnes audit
ALTER TABLE "Accompagnement"
  ADD COLUMN IF NOT EXISTS "modifieParId" INTEGER,
  ADD COLUMN IF NOT EXISTS "saisieParId" INTEGER;

-- AccompagnementSortie
ALTER TABLE "AccompagnementSortie" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ActionCollective : ajouter les colonnes audit
ALTER TABLE "ActionCollective"
  ADD COLUMN IF NOT EXISTS "modifieParId" INTEGER,
  ADD COLUMN IF NOT EXISTS "saisieParId" INTEGER;

-- CategorieAtelier
ALTER TABLE "CategorieAtelier" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CompteurPartenaire
ALTER TABLE "CompteurPartenaire" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Demarches : supprimer colonne obsolète + updatedAt
ALTER TABLE "Demarches" DROP COLUMN IF EXISTS "atelierNoms";
ALTER TABLE "Demarches" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Entretien
ALTER TABLE "Entretien" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Person : ajouter les colonnes audit
ALTER TABLE "Person"
  ADD COLUMN IF NOT EXISTS "modifieParId" INTEGER,
  ADD COLUMN IF NOT EXISTS "saisieParId" INTEGER;

-- Prestataire
ALTER TABLE "Prestataire" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- SuiviASID : renommer la contrainte PK (instruction séparée obligatoire)
ALTER TABLE "SuiviASID" RENAME CONSTRAINT "AccompagnementASID_pkey" TO "SuiviASID_pkey";

-- SuiviEI
ALTER TABLE "SuiviEI" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ThemeAtelierRef
ALTER TABLE "ThemeAtelierRef" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- User : ajouter permissionsOverrides
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "permissionsOverrides" JSONB;

-- Visit : supprimer la valeur par défaut de partenaires
ALTER TABLE "Visit" ALTER COLUMN "partenaires" DROP DEFAULT;

-- CreateTable AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" INTEGER NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_entite_entiteId_idx" ON "AuditLog"("entite", "entiteId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- RenameForeignKey Accompagnement (conditionnel)
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.table_constraints
    WHERE constraint_name = 'AccompagnementFSE_personId_fkey' AND table_name = 'Accompagnement'
  ) THEN
    ALTER TABLE "Accompagnement" RENAME CONSTRAINT "AccompagnementFSE_personId_fkey" TO "Accompagnement_personId_fkey";
  END IF;
END $$;

-- AddForeignKey Person audit
ALTER TABLE "Person" DROP CONSTRAINT IF EXISTS "Person_saisieParId_fkey";
ALTER TABLE "Person" ADD CONSTRAINT "Person_saisieParId_fkey"
  FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Person" DROP CONSTRAINT IF EXISTS "Person_modifieParId_fkey";
ALTER TABLE "Person" ADD CONSTRAINT "Person_modifieParId_fkey"
  FOREIGN KEY ("modifieParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Accompagnement audit
ALTER TABLE "Accompagnement" DROP CONSTRAINT IF EXISTS "Accompagnement_saisieParId_fkey";
ALTER TABLE "Accompagnement" ADD CONSTRAINT "Accompagnement_saisieParId_fkey"
  FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Accompagnement" DROP CONSTRAINT IF EXISTS "Accompagnement_modifieParId_fkey";
ALTER TABLE "Accompagnement" ADD CONSTRAINT "Accompagnement_modifieParId_fkey"
  FOREIGN KEY ("modifieParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey ActionCollective audit
ALTER TABLE "ActionCollective" DROP CONSTRAINT IF EXISTS "ActionCollective_saisieParId_fkey";
ALTER TABLE "ActionCollective" ADD CONSTRAINT "ActionCollective_saisieParId_fkey"
  FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActionCollective" DROP CONSTRAINT IF EXISTS "ActionCollective_modifieParId_fkey";
ALTER TABLE "ActionCollective" ADD CONSTRAINT "ActionCollective_modifieParId_fkey"
  FOREIGN KEY ("modifieParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey AuditLog
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex SuiviASID (conditionnel)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'AccompagnementASID_fseId_key') THEN
    ALTER INDEX "AccompagnementASID_fseId_key" RENAME TO "SuiviASID_accompagnementId_key";
  END IF;
END $$;
