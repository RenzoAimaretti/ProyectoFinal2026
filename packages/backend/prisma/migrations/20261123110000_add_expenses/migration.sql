-- Sprint 4, Unidad 3: categorias de gasto, gastos manuales por lote y sugerencias del supervisor.
-- Migracion aditiva: solo crea objetos nuevos, no altera tablas existentes.
-- Ademas de lo que genera Prisma incluye el indice unico parcial de sugerencia
-- pendiente y los CHECK de grano/monto, que Prisma no expresa.

-- CreateEnum
CREATE TYPE "ExpenseSuggestionKind" AS ENUM ('EDICION', 'BAJA');

-- CreateEnum
CREATE TYPE "ExpenseSuggestionStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "unit" "MoneyUnit" NOT NULL,
    "grain" "Grain",
    "grainArsPerTon" DECIMAL(18,4),
    "usdRate" DECIMAL(18,4),
    "usdRateType" "UsdRateType",
    "priceSource" TEXT,
    "priceFetchedAt" TIMESTAMP(3),
    "priceStale" BOOLEAN NOT NULL DEFAULT false,
    "amountArs" DECIMAL(18,4) NOT NULL,
    "valuedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
    -- Grano obligatorio si y solo si la moneda es kilos de cereal.
    CONSTRAINT "Expense_grain_check" CHECK (("unit" = 'KG_CEREAL') = ("grain" IS NOT NULL)),
    -- Montos no negativos: 0 es un valor valido.
    CONSTRAINT "Expense_amounts_non_negative_check" CHECK ("amount" >= 0 AND "amountArs" >= 0)
);

-- CreateTable
CREATE TABLE "ExpenseSuggestion" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "ExpenseSuggestionKind" NOT NULL,
    "status" "ExpenseSuggestionStatus" NOT NULL DEFAULT 'PENDIENTE',
    "proposedLotId" TEXT,
    "proposedCategoryId" TEXT,
    "proposedDate" TIMESTAMP(3),
    "proposedDescription" TEXT,
    "proposedAmount" DECIMAL(18,4),
    "proposedUnit" "MoneyUnit",
    "proposedGrain" "Grain",
    "suggestedBy" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseSuggestion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExpenseSuggestion_proposed_amount_check" CHECK ("proposedAmount" IS NULL OR "proposedAmount" >= 0),
    -- Una baja no propone valores: solo la edicion los lleva.
    CONSTRAINT "ExpenseSuggestion_baja_without_values_check" CHECK (
        "kind" = 'EDICION'
        OR ("proposedLotId" IS NULL AND "proposedCategoryId" IS NULL AND "proposedDate" IS NULL
            AND "proposedDescription" IS NULL AND "proposedAmount" IS NULL
            AND "proposedUnit" IS NULL AND "proposedGrain" IS NULL)
    )
);

-- CreateIndex
CREATE INDEX "ExpenseCategory_tenantId_idx" ON "ExpenseCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_tenantId_name_key" ON "ExpenseCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Expense_companyId_lotId_date_idx" ON "Expense"("companyId", "lotId", "date");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "ExpenseSuggestion_companyId_status_idx" ON "ExpenseSuggestion"("companyId", "status");

-- CreateIndex
CREATE INDEX "ExpenseSuggestion_suggestedBy_idx" ON "ExpenseSuggestion"("suggestedBy");

-- CreateIndex
CREATE INDEX "ExpenseSuggestion_expenseId_idx" ON "ExpenseSuggestion"("expenseId");

-- CreateIndex
-- Una sola sugerencia PENDIENTE por gasto, aunque dos requests compitan.
CREATE UNIQUE INDEX "ExpenseSuggestion_one_pending_per_expense" ON "ExpenseSuggestion"("expenseId") WHERE "status" = 'PENDIENTE';

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSuggestion" ADD CONSTRAINT "ExpenseSuggestion_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
