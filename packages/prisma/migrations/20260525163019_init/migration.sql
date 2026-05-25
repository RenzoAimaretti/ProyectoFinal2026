/*
  Warnings:

  - You are about to drop the column `companyId` on the `Module` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Module" DROP CONSTRAINT "Module_companyId_fkey";

-- AlterTable
ALTER TABLE "Module" DROP COLUMN "companyId";

-- CreateTable
CREATE TABLE "_CompanyToModule" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompanyToModule_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CompanyToModule_B_index" ON "_CompanyToModule"("B");

-- AddForeignKey
ALTER TABLE "_CompanyToModule" ADD CONSTRAINT "_CompanyToModule_A_fkey" FOREIGN KEY ("A") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToModule" ADD CONSTRAINT "_CompanyToModule_B_fkey" FOREIGN KEY ("B") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
