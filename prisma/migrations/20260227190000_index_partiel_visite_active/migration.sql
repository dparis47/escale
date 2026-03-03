-- CreateIndex (partial) : unicité personId+date uniquement sur les visites actives (deletedAt IS NULL)
-- Permet de recréer une visite après un soft delete.
-- L'index précédent (Visit_personId_date_key) a été supprimé dans la migration précédente.
CREATE UNIQUE INDEX "Visit_personId_date_active_key"
  ON "Visit" ("personId", date)
  WHERE "deletedAt" IS NULL;
