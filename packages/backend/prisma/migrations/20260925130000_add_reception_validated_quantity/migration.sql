-- AlterTable
-- R014/R015: the administrator agrees a validated quantity per reception item.
-- The column is nullable on purpose: a PENDIENTE_VALIDACION reception has no
-- agreed quantity yet, so no backfill is required and the change is safe on a
-- table that already contains rows. No migration is applied to any database by
-- this change.
ALTER TABLE "ReceptionItem" ADD COLUMN "validatedQuantity" DOUBLE PRECISION;
