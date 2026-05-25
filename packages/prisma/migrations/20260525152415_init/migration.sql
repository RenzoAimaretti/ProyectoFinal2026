/*
  Warnings:

  - You are about to drop the column `operatorId` on the `Task` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_operatorId_fkey";

-- AlterTable
ALTER TABLE "Livestock" ADD COLUMN     "lotId" TEXT;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "operatorId";

-- CreateTable
CREATE TABLE "_TaskOperators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskOperators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TaskOperators_B_index" ON "_TaskOperators"("B");

-- AddForeignKey
ALTER TABLE "Livestock" ADD CONSTRAINT "Livestock_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskOperators" ADD CONSTRAINT "_TaskOperators_A_fkey" FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskOperators" ADD CONSTRAINT "_TaskOperators_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
