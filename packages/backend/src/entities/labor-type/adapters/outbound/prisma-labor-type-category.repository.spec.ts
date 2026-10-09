import { PrismaLaborTypeCategoryRepository } from './prisma-labor-type-category.repository';

describe('PrismaLaborTypeCategoryRepository', () => {
  it('replaces the complete set atomically so a second request removes an id from the first', async () => {
    let assigned = ['old-category'];
    const tx = {
      laborTypeCategory: {
        deleteMany: jest.fn().mockImplementation(async () => { assigned = []; }),
        createMany: jest.fn().mockImplementation(async ({ data }: { data: Array<{ categoryId: string }> }) => { assigned = data.map((row) => row.categoryId); }),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (work: (client: typeof tx) => Promise<void>) => work(tx)),
    };
    const repository = new PrismaLaborTypeCategoryRepository(prisma as never);
    await repository.replaceCategoriesForTenant('labor-1', 'tenant-1', ['category-1', 'category-2']);
    expect(assigned).toEqual(['category-1', 'category-2']);
    await repository.replaceCategoriesForTenant('labor-1', 'tenant-1', ['category-2']);
    expect(assigned).toEqual(['category-2']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
