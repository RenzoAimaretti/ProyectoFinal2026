-- Phytosanitary prescriptions (recetas fitosanitarias) — R1..R8.
--
-- Why this change: an agronomist (INGENIERO) writes one phytosanitary
-- prescription per task; a task whose LaborType requires a prescription is born
-- SIN_RECETA and becomes CON_RECETA once the prescription is attached. The
-- dosage basis (per hectare or as a concentration) is stored per RecipeItem.
--
-- Why it is safe on tables that already contain rows:
--   * "UserRole" only gains a new value; existing rows are untouched.
--   * "PrescriptionStatus" and "DosageBasis" are brand-new enum types.
--   * Every new column is nullable or carries a default
--     (LaborType.requiresPrescription defaults to false,
--      Task.prescriptionStatus defaults to 'NO_REQUIERE',
--      RecipeItem.dosageBasis defaults to 'POR_HECTAREA',
--      and the new Recipe columns are all nullable), so no backfill is required
--      and existing rows stay valid.
--   * Recipe.lotId is intentionally kept: the mobile app and GET /recipes?lotId=
--     depend on it.
--   * Recipe.taskId is optional and ON DELETE SET NULL on purpose: a task is
--     soft-deleted through its `deleted` flag, and prescription history must
--     survive.
--
-- No migration is applied to any database by this change: Postgres is not
-- reachable in this workspace, so this file is authored, not executed.

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'INGENIERO';

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('NO_REQUIERE', 'SIN_RECETA', 'CON_RECETA');

-- CreateEnum
CREATE TYPE "DosageBasis" AS ENUM ('POR_HECTAREA', 'CONCENTRACION');

-- AlterTable
ALTER TABLE "LaborType" ADD COLUMN "requiresPrescription" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "prescriptionStatus" "PrescriptionStatus" NOT NULL DEFAULT 'NO_REQUIERE';

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "taskId" TEXT,
ADD COLUMN "pest" TEXT,
ADD COLUMN "crop" TEXT,
ADD COLUMN "reapplicationIntervalDays" INTEGER,
ADD COLUMN "reapplicationDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_taskId_key" ON "Recipe"("taskId");

-- CreateIndex
CREATE INDEX "Task_prescriptionStatus_idx" ON "Task"("prescriptionStatus");

-- AlterTable
ALTER TABLE "RecipeItem" ADD COLUMN "dosageBasis" "DosageBasis" NOT NULL DEFAULT 'POR_HECTAREA';

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
