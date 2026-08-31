-- Add tenant ownership to TaskType and enforce company-local names.
--
-- Existing task types are backfilled from related tasks when possible:
-- TaskType -> Task -> Lot -> Farm.companyId. Task types without tasks fall back
-- to the first Company so the NOT NULL constraint can be applied in dev/demo data.
-- If a populated environment has TaskType rows but no Company rows, stop instead
-- of silently writing invalid tenant data.

-- AlterTable
ALTER TABLE "TaskType" ADD COLUMN "companyId" TEXT;

-- Backfill from existing task usage when the task type is only used by one company.
UPDATE "TaskType" AS tt
SET "companyId" = scoped."companyId"
FROM (
  SELECT
    t."taskTypeId",
    MIN(f."companyId") AS "companyId"
  FROM "Task" AS t
  INNER JOIN "Lot" AS l ON l."id" = t."lotId"
  INNER JOIN "Farm" AS f ON f."id" = l."farmId"
  GROUP BY t."taskTypeId"
  HAVING COUNT(DISTINCT f."companyId") = 1
) AS scoped
WHERE tt."id" = scoped."taskTypeId";

-- Backfill task types without any task usage to the first available company.
UPDATE "TaskType"
SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1)
WHERE "companyId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Task" WHERE "Task"."taskTypeId" = "TaskType"."id")
  AND EXISTS (SELECT 1 FROM "Company");

-- Refuse to continue if any rows could not be safely assigned.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "TaskType" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate TaskType.companyId: existing TaskType rows need an explicit Company backfill';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "TaskType" ALTER COLUMN "companyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "TaskType" ADD CONSTRAINT "TaskType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "TaskType_companyId_idx" ON "TaskType"("companyId");

-- CreateIndex
CREATE INDEX "TaskType_companyId_name_idx" ON "TaskType"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TaskType_companyId_name_key" ON "TaskType"("companyId", "name");
