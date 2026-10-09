import { PrismaLaborTypeInputCategoryReader } from './prisma-labor-type-input-category.reader';

describe('PrismaLaborTypeInputCategoryReader', () => {
  it('resolves only non-deleted categories of the caller tenant', async () => {
    const prisma = { inputCategory: { findMany: jest.fn().mockResolvedValue([{ id: 'allowed' }]) } };
    const reader = new PrismaLaborTypeInputCategoryReader(prisma as never);
    await expect(reader.findByIdsForTenant(['allowed', 'foreign', 'deleted'], 'tenant-1')).resolves.toEqual([{ id: 'allowed' }]);
    expect(prisma.inputCategory.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['allowed', 'foreign', 'deleted'] }, tenantId: 'tenant-1', deleted: false },
      select: { id: true },
    });
  });
});
