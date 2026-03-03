-- Référent en saisie libre (nom + prénom)
ALTER TABLE "AccompagnementASID" ADD COLUMN "referentNom" TEXT;
ALTER TABLE "AccompagnementASID" ADD COLUMN "referentPrenom" TEXT;

-- Suppression de la colonne prescripteurVille (retirée du formulaire)
ALTER TABLE "AccompagnementASID" DROP COLUMN "prescripteurVille";

-- Changement de renouvellementN : Boolean → Integer (peut valoir 0, 1 ou 2)
ALTER TABLE "AccompagnementASID" DROP COLUMN "renouvellementN";
ALTER TABLE "AccompagnementASID" ADD COLUMN "renouvellementN" INTEGER NOT NULL DEFAULT 0;
