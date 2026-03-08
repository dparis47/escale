-- Renommer les catégories (majuscules)
UPDATE "CategorieAtelier" SET "nom" = 'Santé - Bien-être' WHERE "nom" = 'santé - bien-être';
UPDATE "CategorieAtelier" SET "nom" = 'Santé par l''activité physique' WHERE "nom" = 'santé par l''activité physique';
UPDATE "CategorieAtelier" SET "nom" = 'Alimentation' WHERE "nom" = 'alimentation';
UPDATE "CategorieAtelier" SET "nom" = 'Gestion du budget' WHERE "nom" = 'gestion du budget';
UPDATE "CategorieAtelier" SET "nom" = 'Accès à la culture' WHERE "nom" = 'accès à la culture';
UPDATE "CategorieAtelier" SET "nom" = 'Inclusion numérique' WHERE "nom" = 'inclusion numérique';

-- Ajouter la catégorie "Santé - Environnement" (ordre 3, décaler les suivantes)
UPDATE "CategorieAtelier" SET "ordre" = "ordre" + 1 WHERE "ordre" >= 3 AND "deletedAt" IS NULL;
INSERT INTO "CategorieAtelier" ("nom", "couleur", "ordre", "updatedAt")
VALUES ('Santé - Environnement', 'teal', 3, CURRENT_TIMESTAMP);

-- Renommer les thèmes (majuscules)
UPDATE "ThemeAtelierRef" SET "nom" = 'Socio-Esthétique' WHERE "nom" = 'socio-esthétique';
UPDATE "ThemeAtelierRef" SET "nom" = 'Atelier Créatif' WHERE "nom" = 'atelier créatif';
UPDATE "ThemeAtelierRef" SET "nom" = 'Santé - Environnement' WHERE "nom" = 'santé - environnement';
UPDATE "ThemeAtelierRef" SET "nom" = 'Sport' WHERE "nom" = 'sport';
UPDATE "ThemeAtelierRef" SET "nom" = 'Randonnée' WHERE "nom" = 'randonnée';
UPDATE "ThemeAtelierRef" SET "nom" = 'Piscine' WHERE "nom" = 'piscine';
UPDATE "ThemeAtelierRef" SET "nom" = 'Cuisine' WHERE "nom" = 'cuisine';
UPDATE "ThemeAtelierRef" SET "nom" = 'Cuisine Anti-gaspillage' WHERE "nom" = 'cuisine anti-gaspillage';
UPDATE "ThemeAtelierRef" SET "nom" = 'Cuisine Diététique' WHERE "nom" = 'cuisine diététique';
UPDATE "ThemeAtelierRef" SET "nom" = 'Budget' WHERE "nom" = 'budget';
UPDATE "ThemeAtelierRef" SET "nom" = 'Atelier Bilan' WHERE "nom" = 'bilan';
UPDATE "ThemeAtelierRef" SET "nom" = 'Cinéma' WHERE "nom" = 'cinéma';
UPDATE "ThemeAtelierRef" SET "nom" = 'Jeux de Société' WHERE "nom" = 'jeux de société';
UPDATE "ThemeAtelierRef" SET "nom" = 'L''Escale fait son Cinéma' WHERE "nom" = 'L''Escale fait son cinéma';
UPDATE "ThemeAtelierRef" SET "nom" = 'Projet Culturel Itinérant' WHERE "nom" = 'projet culturel itinérant';
UPDATE "ThemeAtelierRef" SET "nom" = 'Cours d''Informatique' WHERE "nom" = 'cours d''informatique';

-- Mettre à jour les noms d'ateliers stockés dans Demarches.atelierNoms
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'socio-esthétique', 'Socio-Esthétique') WHERE 'socio-esthétique' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'atelier créatif', 'Atelier Créatif') WHERE 'atelier créatif' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'santé - environnement', 'Santé - Environnement') WHERE 'santé - environnement' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'sport', 'Sport') WHERE 'sport' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'randonnée', 'Randonnée') WHERE 'randonnée' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'piscine', 'Piscine') WHERE 'piscine' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'cuisine', 'Cuisine') WHERE 'cuisine' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'cuisine anti-gaspillage', 'Cuisine Anti-gaspillage') WHERE 'cuisine anti-gaspillage' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'cuisine diététique', 'Cuisine Diététique') WHERE 'cuisine diététique' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'budget', 'Budget') WHERE 'budget' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'bilan', 'Atelier Bilan') WHERE 'bilan' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'cinéma', 'Cinéma') WHERE 'cinéma' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'jeux de société', 'Jeux de Société') WHERE 'jeux de société' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'L''Escale fait son cinéma', 'L''Escale fait son Cinéma') WHERE 'L''Escale fait son cinéma' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'projet culturel itinérant', 'Projet Culturel Itinérant') WHERE 'projet culturel itinérant' = ANY("atelierNoms");
UPDATE "Demarches" SET "atelierNoms" = array_replace("atelierNoms", 'cours d''informatique', 'Cours d''Informatique') WHERE 'cours d''informatique' = ANY("atelierNoms");
