-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "modifieParId" INTEGER;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
