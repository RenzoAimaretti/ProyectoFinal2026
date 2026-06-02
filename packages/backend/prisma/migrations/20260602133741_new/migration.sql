/*
  Warnings:

  - You are about to drop the column `companyId` on the `Module` table. All the data in the column will be lost.
  - You are about to drop the column `operatorId` on the `Task` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Module" DROP CONSTRAINT "Module_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_operatorId_fkey";

-- AlterTable
ALTER TABLE "Livestock" ADD COLUMN     "lotId" TEXT;

-- AlterTable
ALTER TABLE "Module" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "operatorId";

-- CreateTable
CREATE TABLE "_CompanyToModule" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompanyToModule_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TaskOperators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskOperators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CompanyToModule_B_index" ON "_CompanyToModule"("B");

-- CreateIndex
CREATE INDEX "_TaskOperators_B_index" ON "_TaskOperators"("B");

-- AddForeignKey
ALTER TABLE "Livestock" ADD CONSTRAINT "Livestock_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToModule" ADD CONSTRAINT "_CompanyToModule_A_fkey" FOREIGN KEY ("A") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToModule" ADD CONSTRAINT "_CompanyToModule_B_fkey" FOREIGN KEY ("B") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskOperators" ADD CONSTRAINT "_TaskOperators_A_fkey" FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskOperators" ADD CONSTRAINT "_TaskOperators_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
