-- Migration : ajout colonne partenaires (TEXT[]) sur Visit
ALTER TABLE "Visit" ADD COLUMN "partenaires" TEXT[] NOT NULL DEFAULT '{}';
