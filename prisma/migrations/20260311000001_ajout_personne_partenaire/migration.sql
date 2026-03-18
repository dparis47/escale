CREATE TABLE "PersonnePartenaire" (
    "id"         SERIAL PRIMARY KEY,
    "date"       DATE NOT NULL,
    "partenaire" TEXT NOT NULL,
    "nom"        TEXT NOT NULL,
    "dateRDV"    DATE NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt"  TIMESTAMP(3)
);
CREATE INDEX "PersonnePartenaire_date_partenaire_idx" ON "PersonnePartenaire"("date", "partenaire");
