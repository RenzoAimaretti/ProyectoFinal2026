-- Keep the work date captured in the field. Historical usages keep NULL and
-- fall back to createdAt when reading accumulated metrics.
ALTER TABLE "MachineUsage" ADD COLUMN "workDate" TIMESTAMP(3);
