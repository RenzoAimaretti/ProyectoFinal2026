import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Labor type Prisma schema and generated client', () => {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const laborTypeGeneratedPath = join(process.cwd(), 'prisma', 'generated', 'models', 'LaborType.ts');
  const tenantGeneratedPath = join(process.cwd(), 'prisma', 'generated', 'models', 'Tenant.ts');

  it('declares labor-type tenant ownership in the Prisma schema', () => {
    const schema = readFileSync(schemaPath, 'utf8').replace(/\s+/g, ' ');

    expect(schema).toContain('laborTypes LaborType[]');
    expect(schema).toContain('tenantId String');
    expect(schema).toContain('tenant Tenant @relation(fields: [tenantId], references: [id])');
    expect(schema).toContain('@@unique([tenantId, name])');
    expect(schema).toContain('@@index([tenantId])');
  });

  it('exposes tenant-aware LaborType and Tenant inputs in the generated Prisma client', () => {
    const laborTypeGenerated = readFileSync(laborTypeGeneratedPath, 'utf8');
    const tenantGenerated = readFileSync(tenantGeneratedPath, 'utf8');

    expect(laborTypeGenerated).toContain('tenantId: string');
    expect(laborTypeGenerated).toContain('tenant: Prisma.TenantCreateNestedOneWithoutLaborTypesInput');
    expect(laborTypeGenerated).toContain('LaborTypeTenantIdNameCompoundUniqueInput');
    expect(tenantGenerated).toContain('laborTypes?: Prisma.LaborTypeCreateNestedManyWithoutTenantInput');
  });
});
