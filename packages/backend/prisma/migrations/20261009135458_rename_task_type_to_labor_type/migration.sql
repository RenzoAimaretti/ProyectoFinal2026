-- Data-preserving rename: TaskType -> LaborType.
-- No DROP/CREATE: only RENAME so existing rows are preserved.

-- 1. Rename the table and its primary key constraint.
ALTER TABLE "TaskType" RENAME TO "LaborType";
ALTER TABLE "LaborType" RENAME CONSTRAINT "TaskType_pkey" TO "LaborType_pkey";

-- 2. Rename the tenant-owned indexes on the renamed table.
ALTER INDEX "TaskType_tenantId_idx" RENAME TO "LaborType_tenantId_idx";
ALTER INDEX "TaskType_tenantId_name_key" RENAME TO "LaborType_tenantId_name_key";

-- 3. Rename the FK from the renamed table to Tenant.
ALTER TABLE "LaborType" RENAME CONSTRAINT "TaskType_tenantId_fkey" TO "LaborType_tenantId_fkey";

-- 4. Rename the FK columns on Task and DailyReport.
ALTER TABLE "Task" RENAME COLUMN "taskTypeId" TO "laborTypeId";
ALTER TABLE "DailyReport" RENAME COLUMN "taskTypeId" TO "laborTypeId";

-- 5. Rename the Task index and the FK constraints referencing the renamed column.
ALTER INDEX "Task_taskTypeId_idx" RENAME TO "Task_laborTypeId_idx";
ALTER TABLE "Task" RENAME CONSTRAINT "Task_taskTypeId_fkey" TO "Task_laborTypeId_fkey";
ALTER TABLE "DailyReport" RENAME CONSTRAINT "DailyReport_taskTypeId_fkey" TO "DailyReport_laborTypeId_fkey";
