CREATE TABLE "CompteurPartenaire" (
    "id"         SERIAL PRIMARY KEY,
    "date"       DATE NOT NULL,
    "partenaire" TEXT NOT NULL,
    "count"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompteurPartenaire_date_partenaire_key" UNIQUE ("date", "partenaire")
);
