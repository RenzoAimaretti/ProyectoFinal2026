-- Sprint 4, Unidad 1: tarifario por firma y tipo de labor.
-- Migracion aditiva: solo crea objetos nuevos, no altera tablas existentes.

-- CreateEnum
CREATE TYPE "MoneyUnit" AS ENUM ('ARS', 'USD', 'KG_CEREAL');

-- CreateEnum
CREATE TYPE "Grain" AS ENUM ('TRIGO', 'MAIZ', 'GIRASOL', 'SOJA', 'SORGO');

-- CreateEnum
CREATE TYPE "TariffBasis" AS ENUM ('POR_HECTAREA', 'POR_HORA');

-- CreateEnum
CREATE TYPE "UsdRateType" AS ENUM ('OFICIAL_VENTA', 'OFICIAL_COMPRA', 'BNA_PIZARRA');

-- CreateTable
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "laborTypeId" TEXT NOT NULL,
    "priceAmount" DECIMAL(18,4) NOT NULL,
    "priceUnit" "MoneyUnit" NOT NULL,
    "priceGrain" "Grain",
    "priceBasis" "TariffBasis" NOT NULL,
    "costAmount" DECIMAL(18,4) NOT NULL,
    "costUnit" "MoneyUnit" NOT NULL,
    "costGrain" "Grain",
    "costBasis" "TariffBasis" NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id"),
    -- Grano obligatorio si y solo si la moneda es kilos de cereal.
    CONSTRAINT "Tariff_price_grain_check" CHECK (("priceUnit" = 'KG_CEREAL') = ("priceGrain" IS NOT NULL)),
    CONSTRAINT "Tariff_cost_grain_check" CHECK (("costUnit" = 'KG_CEREAL') = ("costGrain" IS NOT NULL)),
    -- Montos no negativos: 0 es un valor valido.
    CONSTRAINT "Tariff_amounts_non_negative_check" CHECK ("priceAmount" >= 0 AND "costAmount" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "Tariff_companyId_laborTypeId_key" ON "Tariff"("companyId", "laborTypeId");

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_laborTypeId_fkey" FOREIGN KEY ("laborTypeId") REFERENCES "LaborType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
