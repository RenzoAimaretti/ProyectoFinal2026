// Development bootstrap seed.
//
// Why this exists: `Company.tenantId` is NOT NULL and every write path derives the
// tenant from the authenticated request, so an empty database cannot be bootstrapped
// through the API. This seed creates the minimum working set:
//   Tenant -> Company (firma) -> User -> UserCompany
//
// Idempotent: fixed ids + upserts, safe to run repeatedly.
// Run with: pnpm --filter backend db:seed
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

const TENANT_ID = '00000000-0000-4000-8000-000000000001';
const COMPANY_ID = '00000000-0000-4000-8000-000000000002';
const USER_ID = '00000000-0000-4000-8000-000000000003';
const USER_COMPANY_ID = '00000000-0000-4000-8000-000000000004';

const TENANT_NAME = process.env.SEED_TENANT_NAME ?? 'Grupo Eliggi';
const COMPANY_NAME = process.env.SEED_COMPANY_NAME ?? 'Eliggi';
const COMPANY_CUIT = process.env.SEED_COMPANY_CUIT ?? '30-00000000-1';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@agrolify.local';
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL!),
  });

  try {
    await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: {},
      create: { id: TENANT_ID, name: TENANT_NAME },
    });

    await prisma.company.upsert({
      where: { id: COMPANY_ID },
      update: {},
      create: {
        id: COMPANY_ID,
        tenantId: TENANT_ID,
        name: COMPANY_NAME,
        cuit: COMPANY_CUIT,
      },
    });

    const passwordHash = await argon2.hash(ADMIN_PASSWORD);

    await prisma.user.upsert({
      where: { id: USER_ID },
      update: { tenantId: TENANT_ID },
      create: {
        id: USER_ID,
        tenantId: TENANT_ID,
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Without an active membership the user has no `firmaId` and cannot log in.
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: USER_ID, companyId: COMPANY_ID } },
      update: {},
      create: {
        id: USER_COMPANY_ID,
        userId: USER_ID,
        companyId: COMPANY_ID,
        role: 'ADMIN',
      },
    });

    console.log('[seed] bootstrap OK');
    console.log(`[seed] tenant : ${TENANT_NAME} (${TENANT_ID})`);
    console.log(`[seed] firma  : ${COMPANY_NAME} (${COMPANY_ID})`);
    console.log(`[seed] login  : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed] failed');
  console.error(error);
  process.exit(1);
});
