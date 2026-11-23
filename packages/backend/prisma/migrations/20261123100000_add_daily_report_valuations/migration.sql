-- Sprint 4, Unidad 2: snapshot de valorizacion por parte diario.
-- Migracion aditiva: solo crea objetos nuevos, no altera tablas existentes.

-- CreateEnum
CREATE TYPE "ValuationOrigin" AS ENUM ('APROBACION', 'REINTENTO');

-- CreateTable
CREATE TABLE "DailyReportValuation" (
    "id" TEXT NOT NULL,
    "dailyReportId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "tariffId" TEXT,
    "origin" "ValuationOrigin" NOT NULL,
    "priceAmount" DECIMAL(18,4) NOT NULL,
    "priceUnit" "MoneyUnit" NOT NULL,
    "priceGrain" "Grain",
    "priceBasis" "TariffBasis" NOT NULL,
    "costAmount" DECIMAL(18,4) NOT NULL,
    "costUnit" "MoneyUnit" NOT NULL,
    "costGrain" "Grain",
    "costBasis" "TariffBasis" NOT NULL,
    "hectares" DECIMAL(18,4) NOT NULL,
    "hours" DECIMAL(18,4) NOT NULL,
    "incomeNative" DECIMAL(18,4) NOT NULL,
    "costNative" DECIMAL(18,4) NOT NULL,
    "incomeGrainArsPerTon" DECIMAL(18,4),
    "costGrainArsPerTon" DECIMAL(18,4),
    "usdRate" DECIMAL(18,4),
    "usdRateType" "UsdRateType",
    "grainSource" TEXT,
    "usdSource" TEXT,
    "priceFetchedAt" TIMESTAMP(3),
    "priceStale" BOOLEAN NOT NULL DEFAULT false,
    "incomeArs" DECIMAL(18,4) NOT NULL,
    "costArs" DECIMAL(18,4) NOT NULL,
    "valuedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReportValuation_pkey" PRIMARY KEY ("id"),
    -- Grano obligatorio si y solo si la moneda es kilos de cereal.
    CONSTRAINT "DailyReportValuation_price_grain_check" CHECK (("priceUnit" = 'KG_CEREAL') = ("priceGrain" IS NOT NULL)),
    CONSTRAINT "DailyReportValuation_cost_grain_check" CHECK (("costUnit" = 'KG_CEREAL') = ("costGrain" IS NOT NULL)),
    -- Montos y cantidades no negativos: 0 es un valor valido.
    CONSTRAINT "DailyReportValuation_amounts_non_negative_check" CHECK (
        "priceAmount" >= 0 AND "costAmount" >= 0
        AND "hectares" >= 0 AND "hours" >= 0
        AND "incomeNative" >= 0 AND "costNative" >= 0
        AND "incomeArs" >= 0 AND "costArs" >= 0
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyReportValuation_dailyReportId_key" ON "DailyReportValuation"("dailyReportId");

-- CreateIndex
CREATE INDEX "DailyReportValuation_companyId_lotId_idx" ON "DailyReportValuation"("companyId", "lotId");

-- AddForeignKey
ALTER TABLE "DailyReportValuation" ADD CONSTRAINT "DailyReportValuation_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "DailyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReportValuation" ADD CONSTRAINT "DailyReportValuation_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
