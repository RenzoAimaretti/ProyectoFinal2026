ALTER TABLE "Machine" ADD COLUMN "type" TEXT;

CREATE TABLE "MaintenanceThreshold" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "machineType" TEXT NOT NULL,
    "hoursLimit" DOUBLE PRECISION,
    "hectaresLimit" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceThreshold_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MaintenanceThreshold_positive_limits_check" CHECK (
        ("hoursLimit" IS NOT NULL OR "hectaresLimit" IS NOT NULL)
        AND ("hoursLimit" IS NULL OR ("hoursLimit" > 0 AND "hoursLimit" < 'Infinity'::float8))
        AND ("hectaresLimit" IS NULL OR ("hectaresLimit" > 0 AND "hectaresLimit" < 'Infinity'::float8))
    )
);

CREATE UNIQUE INDEX "MaintenanceThreshold_companyId_machineType_key" ON "MaintenanceThreshold"("companyId", "machineType");
ALTER TABLE "MaintenanceThreshold" ADD CONSTRAINT "MaintenanceThreshold_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
