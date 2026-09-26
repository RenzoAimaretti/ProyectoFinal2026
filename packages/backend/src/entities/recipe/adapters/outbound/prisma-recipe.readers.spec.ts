import { PrismaLotReader } from './prisma-lot.reader';
import { PrismaRecipeInputReader } from './prisma-recipe-input.reader';

describe('PrismaRecipe readers', () => {
  const prisma = {
    lot: { findFirst: jest.fn() },
    input: { findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PrismaLotReader', () => {
    const reader = new PrismaLotReader(prisma as never);

    it('scopes the lot read to the tenant through farm and client', async () => {
      prisma.lot.findFirst.mockResolvedValue({ id: 'lot-1' });

      await expect(
        reader.findByIdForTenant('lot-1', 'tenant-1'),
      ).resolves.toEqual({ id: 'lot-1' });

      expect(prisma.lot.findFirst).toHaveBeenCalledWith({
        where: { id: 'lot-1', farm: { client: { tenantId: 'tenant-1' } } },
        select: { id: true },
      });
    });

    it('returns null when the lot belongs to another tenant', async () => {
      prisma.lot.findFirst.mockResolvedValue(null);

      await expect(
        reader.findByIdForTenant('lot-1', 'tenant-2'),
      ).resolves.toBeNull();
    });
  });

  describe('PrismaRecipeInputReader', () => {
    const reader = new PrismaRecipeInputReader(prisma as never);

    it('resolves only the requested ids owned by the tenant', async () => {
      prisma.input.findMany.mockResolvedValue([{ id: 'input-1' }]);

      await expect(
        reader.findExistingIdsForTenant(['input-1', 'input-2'], 'tenant-1'),
      ).resolves.toEqual(['input-1']);

      expect(prisma.input.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['input-1', 'input-2'] }, tenantId: 'tenant-1' },
        select: { id: true },
      });
    });
  });
});
