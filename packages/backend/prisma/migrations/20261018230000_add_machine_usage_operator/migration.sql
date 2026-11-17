-- Preserve historical usages without an operator while recording the author of new task-linked usages.
ALTER TABLE "MachineUsage" ADD COLUMN "operatorId" TEXT;
