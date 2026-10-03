import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Task type Prisma schema and generated client', () => {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const taskTypeGeneratedPath = join(process.cwd(), 'prisma', 'generated', 'models', 'TaskType.ts');
  const tenantGeneratedPath = join(process.cwd(), 'prisma', 'generated', 'models', 'Tenant.ts');

  it('declares task-type tenant ownership in the Prisma schema', () => {
    const schema = readFileSync(schemaPath, 'utf8').replace(/\s+/g, ' ');

    expect(schema).toContain('taskTypes TaskType[]');
    expect(schema).toContain('tenantId String');
    expect(schema).toContain('tenant Tenant @relation(fields: [tenantId], references: [id])');
    expect(schema).toContain('@@unique([tenantId, name])');
    expect(schema).toContain('@@index([tenantId])');
  });

  it('exposes tenant-aware TaskType and Tenant inputs in the generated Prisma client', () => {
    const taskTypeGenerated = readFileSync(taskTypeGeneratedPath, 'utf8');
    const tenantGenerated = readFileSync(tenantGeneratedPath, 'utf8');

    expect(taskTypeGenerated).toContain('tenantId: string');
    expect(taskTypeGenerated).toContain('tenant: Prisma.TenantCreateNestedOneWithoutTaskTypesInput');
    expect(taskTypeGenerated).toContain('TaskTypeTenantIdNameCompoundUniqueInput');
    expect(tenantGenerated).toContain('taskTypes?: Prisma.TaskTypeCreateNestedManyWithoutTenantInput');
  });
});
