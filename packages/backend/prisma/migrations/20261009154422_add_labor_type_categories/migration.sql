-- CreateTable
CREATE TABLE "LaborTypeCategory" (
    "laborTypeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "LaborTypeCategory_pkey" PRIMARY KEY ("laborTypeId","categoryId")
);

-- CreateIndex
CREATE INDEX "LaborTypeCategory_categoryId_idx" ON "LaborTypeCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "LaborTypeCategory" ADD CONSTRAINT "LaborTypeCategory_laborTypeId_fkey" FOREIGN KEY ("laborTypeId") REFERENCES "LaborType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborTypeCategory" ADD CONSTRAINT "LaborTypeCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InputCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
