-- Émargement par séance : remplacer theme par actionCollectiveId

-- Supprimer les fichiers existants (liés à un thème, plus à une séance)
DELETE FROM "FichierEmargement";

-- Retirer la colonne theme
ALTER TABLE "FichierEmargement" DROP COLUMN "theme";

-- Ajouter la colonne actionCollectiveId
ALTER TABLE "FichierEmargement" ADD COLUMN "actionCollectiveId" INTEGER NOT NULL;

-- Ajouter la clé étrangère
ALTER TABLE "FichierEmargement" ADD CONSTRAINT "FichierEmargement_actionCollectiveId_fkey" FOREIGN KEY ("actionCollectiveId") REFERENCES "ActionCollective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index pour les requêtes par atelier
CREATE INDEX "FichierEmargement_actionCollectiveId_idx" ON "FichierEmargement"("actionCollectiveId");
