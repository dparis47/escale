-- ============================================================
-- Phase A : Créer les nouvelles tables et colonnes
-- ============================================================

-- Table des catégories d'ateliers
CREATE TABLE "CategorieAtelier" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "couleur" TEXT NOT NULL DEFAULT 'gray',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CategorieAtelier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategorieAtelier_nom_key" ON "CategorieAtelier"("nom");

-- Table des thèmes d'ateliers
CREATE TABLE "ThemeAtelierRef" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ThemeAtelierRef_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThemeAtelierRef_categorieId_nom_key" ON "ThemeAtelierRef"("categorieId", "nom");

ALTER TABLE "ThemeAtelierRef"
    ADD CONSTRAINT "ThemeAtelierRef_categorieId_fkey"
    FOREIGN KEY ("categorieId") REFERENCES "CategorieAtelier"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Table des prestataires
CREATE TABLE "Prestataire" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Prestataire_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Prestataire_nom_key" ON "Prestataire"("nom");

-- Ajouter les colonnes FK sur ActionCollective (nullable pour l'instant)
ALTER TABLE "ActionCollective" ADD COLUMN "themeId" INTEGER;
ALTER TABLE "ActionCollective" ADD COLUMN "prestataireId" INTEGER;

-- ============================================================
-- Phase B : Migrer les données
-- ============================================================

-- Insérer les 6 catégories
INSERT INTO "CategorieAtelier" ("nom", "couleur", "ordre", "updatedAt") VALUES
    ('santé - bien-être',                'pink',   1, CURRENT_TIMESTAMP),
    ('santé par l''activité physique',   'green',  2, CURRENT_TIMESTAMP),
    ('alimentation',                     'red',    3, CURRENT_TIMESTAMP),
    ('gestion du budget',                'amber',  4, CURRENT_TIMESTAMP),
    ('accès à la culture',               'indigo', 5, CURRENT_TIMESTAMP),
    ('inclusion numérique',              'blue',   6, CURRENT_TIMESTAMP);

-- Insérer les thèmes dans chaque catégorie
-- santé - bien-être (id=1)
INSERT INTO "ThemeAtelierRef" ("nom", "categorieId", "ordre", "updatedAt") VALUES
    ('socio-esthétique',      (SELECT id FROM "CategorieAtelier" WHERE nom = 'santé - bien-être'), 1, CURRENT_TIMESTAMP),
    ('atelier créatif',       (SELECT id FROM "CategorieAtelier" WHERE nom = 'santé - bien-être'), 2, CURRENT_TIMESTAMP),
    ('santé - environnement', (SELECT id FROM "CategorieAtelier" WHERE nom = 'santé - bien-être'), 3, CURRENT_TIMESTAMP);

-- santé par l'activité physique
INSERT INTO "ThemeAtelierRef" ("nom", "categorieId", "ordre", "updatedAt") VALUES
    ('sport',    (SELECT id FROM "CategorieAtelier" WHERE nom = 'santé par l''activité physique'), 1, CURRENT_TIMESTAMP),
    ('randonnée', (SELECT id FROM "CategorieAtelier" WHERE nom = 'santé par l''activité physique'), 2, CURRENT_TIMESTAMP),
    ('piscine',  (SELECT id FROM "CategorieAtelier" WHERE nom = 'santé par l''activité physique'), 3, CURRENT_TIMESTAMP);

-- alimentation
INSERT INTO "ThemeAtelierRef" ("nom", "categorieId", "ordre", "updatedAt") VALUES
    ('cuisine',               (SELECT id FROM "CategorieAtelier" WHERE nom = 'alimentation'), 1, CURRENT_TIMESTAMP),
    ('cuisine anti-gaspillage', (SELECT id FROM "CategorieAtelier" WHERE nom = 'alimentation'), 2, CURRENT_TIMESTAMP),
    ('cuisine diététique',    (SELECT id FROM "CategorieAtelier" WHERE nom = 'alimentation'), 3, CURRENT_TIMESTAMP);

-- gestion du budget
INSERT INTO "ThemeAtelierRef" ("nom", "categorieId", "ordre", "updatedAt") VALUES
    ('budget', (SELECT id FROM "CategorieAtelier" WHERE nom = 'gestion du budget'), 1, CURRENT_TIMESTAMP),
    ('bilan',  (SELECT id FROM "CategorieAtelier" WHERE nom = 'gestion du budget'), 2, CURRENT_TIMESTAMP);

-- accès à la culture
INSERT INTO "ThemeAtelierRef" ("nom", "categorieId", "ordre", "updatedAt") VALUES
    ('cinéma',                       (SELECT id FROM "CategorieAtelier" WHERE nom = 'accès à la culture'), 1, CURRENT_TIMESTAMP),
    ('jeux de société',              (SELECT id FROM "CategorieAtelier" WHERE nom = 'accès à la culture'), 2, CURRENT_TIMESTAMP),
    ('L''Escale fait son cinéma',    (SELECT id FROM "CategorieAtelier" WHERE nom = 'accès à la culture'), 3, CURRENT_TIMESTAMP),
    ('projet culturel itinérant',    (SELECT id FROM "CategorieAtelier" WHERE nom = 'accès à la culture'), 4, CURRENT_TIMESTAMP);

-- inclusion numérique
INSERT INTO "ThemeAtelierRef" ("nom", "categorieId", "ordre", "updatedAt") VALUES
    ('cours d''informatique', (SELECT id FROM "CategorieAtelier" WHERE nom = 'inclusion numérique'), 1, CURRENT_TIMESTAMP);

-- Migrer les prestataires existants (valeurs uniques non-nulles)
INSERT INTO "Prestataire" ("nom", "updatedAt")
SELECT DISTINCT prestataire, CURRENT_TIMESTAMP
FROM "ActionCollective"
WHERE prestataire IS NOT NULL
  AND TRIM(prestataire) != ''
  AND "deletedAt" IS NULL
ON CONFLICT ("nom") DO NOTHING;

-- Mettre à jour themeId sur ActionCollective en se basant sur l'ancien enum
UPDATE "ActionCollective" SET "themeId" = t.id
FROM "ThemeAtelierRef" t
WHERE t.nom = CASE "ActionCollective".theme::text
    WHEN 'SOCIO_ESTHETIQUE'    THEN 'socio-esthétique'
    WHEN 'ATELIER_CREATIF'     THEN 'atelier créatif'
    WHEN 'SANTE_ENVIRONNEMENT' THEN 'santé - environnement'
    WHEN 'SPORT'               THEN 'sport'
    WHEN 'RANDONNEE'           THEN 'randonnée'
    WHEN 'PISCINE'             THEN 'piscine'
    WHEN 'CUISINE'             THEN 'cuisine'
    WHEN 'CUISINE_ANTI_GASPI'  THEN 'cuisine anti-gaspillage'
    WHEN 'BUDGET'              THEN 'budget'
    WHEN 'COURS_INFORMATIQUE'  THEN 'cours d''informatique'
    WHEN 'CINEMA'              THEN 'cinéma'
    WHEN 'PROJET_CINEMA'       THEN 'L''Escale fait son cinéma'
    WHEN 'CULTUREL'            THEN 'projet culturel itinérant'
    WHEN 'MEDIATION_EQUINE'    THEN 'sport'
    WHEN 'NOEL'                THEN 'projet culturel itinérant'
    WHEN 'AUTRE'               THEN 'cours d''informatique'
END;

-- Mettre à jour prestataireId sur ActionCollective
UPDATE "ActionCollective" ac SET "prestataireId" = p.id
FROM "Prestataire" p
WHERE ac.prestataire = p.nom
  AND ac.prestataire IS NOT NULL;

-- ============================================================
-- Phase C : Finaliser — rendre themeId NOT NULL, supprimer ancien
-- ============================================================

-- Rendre themeId non-nullable
ALTER TABLE "ActionCollective" ALTER COLUMN "themeId" SET NOT NULL;

-- Ajouter les contraintes FK
ALTER TABLE "ActionCollective"
    ADD CONSTRAINT "ActionCollective_themeId_fkey"
    FOREIGN KEY ("themeId") REFERENCES "ThemeAtelierRef"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActionCollective"
    ADD CONSTRAINT "ActionCollective_prestataireId_fkey"
    FOREIGN KEY ("prestataireId") REFERENCES "Prestataire"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Supprimer les anciennes colonnes
ALTER TABLE "ActionCollective" DROP COLUMN "theme";
ALTER TABLE "ActionCollective" DROP COLUMN "prestataire";

-- Supprimer l'enum ThemeAtelier
DROP TYPE "ThemeAtelier";
