-- CreateTable
CREATE TABLE "FichierEmargement" (
    "id" SERIAL NOT NULL,
    "theme" "ThemeAtelier" NOT NULL,
    "nom" TEXT NOT NULL,
    "contenu" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FichierEmargement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FichierEmargement_theme_key" ON "FichierEmargement"("theme");
