-- Rename table ContratDeTravail -> ContratTravail
ALTER TABLE "ContratDeTravail" RENAME TO "ContratTravail";

-- Drop ContratASID (foreign key + table + enum)
ALTER TABLE "ContratASID" DROP CONSTRAINT IF EXISTS "ContratASID_accompagnementId_fkey";
DROP TABLE IF EXISTS "ContratASID";
DROP TYPE IF EXISTS "TypeContratASID";

-- Rename constraints
ALTER TABLE "ContratTravail" RENAME CONSTRAINT "ContratDeTravail_pkey" TO "ContratTravail_pkey";
ALTER TABLE "ContratTravail" RENAME CONSTRAINT "ContratDeTravail_personId_fkey" TO "ContratTravail_personId_fkey";
