// Run with `node test/lot-delete.integration.cjs` from packages/backend.
// This creates and destroys a uniquely named scratch database; it never deletes development records.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');
const { Client } = createRequire(require.resolve('@prisma/adapter-pg'))('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

async function main() {
  const source = process.env.DATABASE_URL;
  if (!source) throw new Error('DATABASE_URL is required to provision an isolated test database');
  const base = new URL(source);
  const name = `sig_lot_delete_${randomBytes(6).toString('hex')}`;
  const scratch = new URL(source);
  scratch.pathname = `/${name}`;
  assert.notEqual(base.pathname, scratch.pathname);
  const admin = new Client({ connectionString: source });
  let created = false;
  let app;
  let prisma;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    process.env.DATABASE_URL = scratch.toString();
    const prismaCli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build', 'index.js');
    const migrate = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: path.join(__dirname, '..'), env: process.env,
      encoding: 'utf8', timeout: 120000,
    });
    if (migrate.status !== 0) throw new Error(`Scratch migration failed (${migrate.status}): ${migrate.stderr || migrate.stdout}`);

    const { Test } = require('@nestjs/testing');
    const request = require('supertest');
    const { LotModule } = require('../dist/src/entities/lot/lot.module');
    const { JwtAuthGuard } = require('../dist/src/auth/guards/jwt-auth.guard');
    const { PrismaService } = require('../dist/src/prisma/prisma.service');
    let tenantId = 'tenant-delete-a';
    const moduleRef = await Test.createTestingModule({ imports: [LotModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (context) => {
        context.switchToHttp().getRequest().user = { id: 'test-admin', tenantId, role: 'ADMIN' };
        return true;
      } })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.tenant.createMany({ data: [{ id: 'tenant-delete-a', name: 'A' }, { id: 'tenant-delete-b', name: 'B' }] });
    await prisma.company.create({ data: { id: 'company-delete-a', tenantId: 'tenant-delete-a', name: 'Test company', cuit: 'sig-lot-delete-test' } });
    await prisma.client.createMany({ data: [{ id: 'client-delete-a', tenantId: 'tenant-delete-a', name: 'A' }, { id: 'client-delete-b', tenantId: 'tenant-delete-b', name: 'B' }] });
    await prisma.farm.createMany({ data: [{ id: 'farm-delete-a', clientId: 'client-delete-a', name: 'A', surface: 2 }, { id: 'farm-delete-b', clientId: 'client-delete-b', name: 'B', surface: 2 }] });
    await prisma.lot.createMany({ data: [{ id: 'lot-delete-a', farmId: 'farm-delete-a', name: 'Protected', area: 2 }, { id: 'lot-delete-b', farmId: 'farm-delete-b', name: 'Other tenant', area: 2 }, { id: 'lot-delete-free', farmId: 'farm-delete-a', name: 'Free', area: 2 }] });
    await prisma.livestock.create({ data: { id: 'animal-delete-a', companyId: 'company-delete-a', lotId: 'lot-delete-a', tagNumber: 'test-animal', species: 'bovine', sex: 'F' } });
    const http = request(app.getHttpServer());
    const missing = await http.delete('/lots/absent');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.message, 'Lot with id absent not found');
    tenantId = 'tenant-delete-b';
    const foreign = await http.delete('/lots/lot-delete-a');
    assert.equal(foreign.status, 404);
    assert.equal(foreign.body.message, 'Lot with id lot-delete-a not found');
    tenantId = 'tenant-delete-a';
    const conflict = await http.delete('/lots/lot-delete-a');
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.message, 'Lot with id lot-delete-a has related records');
    assert.equal((await prisma.lot.count({ where: { id: 'lot-delete-a' } })), 1);
    assert.equal((await prisma.livestock.findUniqueOrThrow({ where: { id: 'animal-delete-a' } })).lotId, 'lot-delete-a');
    const removed = await http.delete('/lots/lot-delete-free');
    assert.equal(removed.status, 204);
    assert.equal(removed.text, '');
    assert.equal(await prisma.lot.count({ where: { id: 'lot-delete-free' } }), 0);
    assert.equal(await prisma.lot.count(), 2);
    console.log('Scratch HTTP checks: 404 missing/cross-tenant, 409 preserves lot and livestock, 204 removes only unreferenced lot.');

    // Verify the FK/key-share contention that protects a newly linked animal.
    const parent = new Client({ connectionString: scratch.toString() });
    const child = new Client({ connectionString: scratch.toString() });
    await parent.connect(); await child.connect();
    try {
      await prisma.lot.create({ data: { id: 'lot-delete-race', farmId: 'farm-delete-a', name: 'Race', area: 2 } });
      await parent.query('BEGIN');
      await parent.query('SELECT "id" FROM "Lot" WHERE "id" = $1 FOR UPDATE', ['lot-delete-race']);
      await child.query('BEGIN');
      const pending = child.query('UPDATE "Livestock" SET "lotId" = $1 WHERE "id" = $2', ['lot-delete-race', 'animal-delete-a']).then(() => 'linked', () => 'fk-error');
      await parent.query('DELETE FROM "Lot" WHERE "id" = $1', ['lot-delete-race']);
      await parent.query('COMMIT');
      assert.equal(await pending, 'fk-error');
      await child.query('ROLLBACK');
      assert.equal((await prisma.livestock.findUniqueOrThrow({ where: { id: 'animal-delete-a' } })).lotId, 'lot-delete-a');
      assert.equal(await prisma.lot.count({ where: { id: 'lot-delete-race' } }), 0);
      console.log('Scratch FK race check: child association cannot silently detach after locked parent delete.');
    } finally {
      await Promise.allSettled([parent.query('ROLLBACK'), child.query('ROLLBACK')]);
      await Promise.allSettled([parent.end(), child.end()]);
    }
  } finally {
    if (app) await app.close();
    if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
    process.env.DATABASE_URL = source;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
