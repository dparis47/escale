-- CreateTable: PlanningMensuel
CREATE TABLE "PlanningMensuel" (
    "id"           SERIAL NOT NULL,
    "mois"         INTEGER NOT NULL,
    "annee"        INTEGER NOT NULL,
    "nom"          TEXT NOT NULL,
    "contenu"      BYTEA NOT NULL,
    "uploadeParId" INTEGER NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    "deletedAt"    TIMESTAMP(3),
    CONSTRAINT "PlanningMensuel_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex : un seul planning actif par mois/année
CREATE UNIQUE INDEX "PlanningMensuel_mois_annee_key"
  ON "PlanningMensuel"("mois", "annee")
  WHERE "deletedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "PlanningMensuel"
  ADD CONSTRAINT "PlanningMensuel_uploadeParId_fkey"
  FOREIGN KEY ("uploadeParId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
