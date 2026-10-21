-- Default names match INPUT_CATEGORY_DEFAULTS in prisma/input-category-defaults.ts.
CREATE TABLE "InputCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "InputCategory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InputCategory_tenantId_idx" ON "InputCategory"("tenantId");
CREATE UNIQUE INDEX "InputCategory_tenantId_name_key" ON "InputCategory"("tenantId", "name");
ALTER TABLE "InputCategory" ADD CONSTRAINT "InputCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "InputCategory" ("id", "tenantId", "name", "updatedAt")
SELECT gen_random_uuid()::text, t."id", names."name", CURRENT_TIMESTAMP
FROM "Tenant" t
CROSS JOIN (VALUES ('Semilla'), ('Fertilizante'), ('Herbicida'), ('Insecticida'), ('Fungicida'), ('Coadyuvante'), ('Inoculante'), ('Otro')) AS names("name");

ALTER TABLE "Input" ADD COLUMN "categoryId" TEXT;
UPDATE "Input" i SET "categoryId" = c."id"
FROM "InputCategory" c WHERE c."tenantId" = i."tenantId" AND c."name" = 'Otro';
ALTER TABLE "Input" ALTER COLUMN "categoryId" SET NOT NULL;
CREATE INDEX "Input_tenantId_categoryId_idx" ON "Input"("tenantId", "categoryId");
ALTER TABLE "Input" ADD CONSTRAINT "Input_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InputCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
