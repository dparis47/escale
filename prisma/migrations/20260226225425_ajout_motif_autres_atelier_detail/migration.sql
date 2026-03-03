-- AlterEnum
ALTER TYPE "MotifVisite" ADD VALUE 'AUTRES';

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "autreMotif" TEXT,
ADD COLUMN     "nomAtelier" TEXT;
