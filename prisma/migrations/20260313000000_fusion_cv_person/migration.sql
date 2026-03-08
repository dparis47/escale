-- Créer la nouvelle table Cv liée à Person
CREATE TABLE "Cv" (
    "id"        SERIAL NOT NULL,
    "personId"  INTEGER NOT NULL,
    "nom"       TEXT NOT NULL,
    "contenu"   BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cv_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Cv" ADD CONSTRAINT "Cv_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrer les données CvASID (accompagnementId pointe vers SuiviASID.id)
INSERT INTO "Cv" ("personId", "nom", "contenu", "createdAt")
SELECT a."personId", c."nom", c."contenu", c."createdAt"
FROM "CvASID" c
JOIN "SuiviASID" s ON s."id" = c."accompagnementId"
JOIN "Accompagnement" a ON a."id" = s."accompagnementId";

-- Migrer les données CvEI (suiviEIId pointe vers SuiviEI.id)
INSERT INTO "Cv" ("personId", "nom", "contenu", "createdAt")
SELECT a."personId", c."nom", c."contenu", c."createdAt"
FROM "CvEI" c
JOIN "SuiviEI" s ON s."id" = c."suiviEIId"
JOIN "Accompagnement" a ON a."id" = s."accompagnementId";

-- Supprimer les anciennes tables
DROP TABLE "CvASID";
DROP TABLE "CvEI";
