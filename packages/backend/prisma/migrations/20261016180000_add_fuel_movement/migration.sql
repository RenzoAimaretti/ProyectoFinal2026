-- Historical COMBUSTIBLE activities retain NULL and are interpreted as INCOME.
CREATE TYPE "FuelMovement" AS ENUM ('INCOME', 'CONSUMPTION');
ALTER TABLE "MachineActivity" ADD COLUMN "fuelMovement" "FuelMovement";
