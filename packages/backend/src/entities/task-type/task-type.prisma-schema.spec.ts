import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Task type Prisma schema and generated client', () => {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const taskTypeGeneratedPath = join(process.cwd(), 'prisma', 'generated', 'models', 'TaskType.ts');
  const companyGeneratedPath = join(process.cwd(), 'prisma', 'generated', 'models', 'Company.ts');

  it('declares task-type tenant ownership in the Prisma schema', () => {
    const schema = readFileSync(schemaPath, 'utf8').replace(/\s+/g, ' ');

    expect(schema).toContain('taskTypes TaskType[]');
    expect(schema).toContain('companyId String');
    expect(schema).toContain('company Company @relation(fields: [companyId], references: [id])');
    expect(schema).toContain('@@unique([companyId, name])');
    expect(schema).toContain('@@index([companyId])');
    expect(schema).toContain('@@index([companyId, name])');
  });

  it('exposes tenant-aware TaskType and Company inputs in the generated Prisma client', () => {
    const taskTypeGenerated = readFileSync(taskTypeGeneratedPath, 'utf8');
    const companyGenerated = readFileSync(companyGeneratedPath, 'utf8');

    expect(taskTypeGenerated).toContain('companyId: string');
    expect(taskTypeGenerated).toContain('company: Prisma.CompanyCreateNestedOneWithoutTaskTypesInput');
    expect(taskTypeGenerated).toContain('TaskTypeCompanyIdNameCompoundUniqueInput');
    expect(companyGenerated).toContain('taskTypes?: Prisma.TaskTypeCreateNestedManyWithoutCompanyInput');
  });
});
