ALTER TABLE "MachineActivity" ADD COLUMN "receiptFileKey" TEXT, ADD COLUMN "receiptMimeType" TEXT;
CREATE UNIQUE INDEX "MachineActivity_receiptFileKey_key" ON "MachineActivity"("receiptFileKey");
