-- Create the InputUnit vocabulary and snapshot every stock balance's unit.
--
-- This migration is intentionally data-preserving: Prisma's generated diff
-- would DROP and re-ADD `Input.unit`, destroying the catalogue. Instead:
--   1. unknown unit values fail loudly (no silent mapping), and
--   2. `Stock.unit` is backfilled from the input each balance references.

CREATE TYPE "InputUnit" AS ENUM ('L', 'KG', 'UNIT');

DO $$
DECLARE
  offenders text;
BEGIN
  SELECT string_agg(DISTINCT quote_literal("unit"), ', ')
    INTO offenders
    FROM "Input"
   WHERE upper(trim("unit")) NOT IN ('L', 'KG', 'UNIT');

  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION
      'Input.unit contains values outside the InputUnit vocabulary (L, KG, UNIT): %',
      offenders;
  END IF;
END;
$$;

ALTER TABLE "Input"
  ALTER COLUMN "unit" TYPE "InputUnit"
  USING (upper(trim("unit"))::"InputUnit");

ALTER TABLE "Stock" ADD COLUMN "unit" "InputUnit";

UPDATE "Stock" s
   SET "unit" = i."unit"
  FROM "Input" i
 WHERE i."id" = s."inputId";

ALTER TABLE "Stock" ALTER COLUMN "unit" SET NOT NULL;
