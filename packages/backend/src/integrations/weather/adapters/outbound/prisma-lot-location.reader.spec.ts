import { PrismaLotLocationReader } from './prisma-lot-location.reader';

describe('PrismaLotLocationReader', () => {
  const prisma = {
    lot: { findFirst: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByLotAndTenant', () => {
    const reader = new PrismaLotLocationReader(prisma as never);

    it('resolves the lot only inside the caller tenant', async () => {
      prisma.lot.findFirst.mockResolvedValue({
        coords: '[[-33.15,-64.35]]',
        farmId: 'farm-1',
        farm: { location: 'Córdoba' },
      });

      await expect(
        reader.findByLotAndTenant('lot-1', 'tenant-1'),
      ).resolves.toEqual({
        coords: '[[-33.15,-64.35]]',
        farmId: 'farm-1',
        farmLocation: 'Córdoba',
      });

      expect(prisma.lot.findFirst).toHaveBeenCalledWith({
        where: { id: 'lot-1', farm: { client: { tenantId: 'tenant-1' } } },
        select: {
          coords: true,
          farmId: true,
          farm: { select: { location: true } },
        },
      });
    });

    it('returns null when the lot belongs to another tenant', async () => {
      prisma.lot.findFirst.mockResolvedValue(null);

      await expect(
        reader.findByLotAndTenant('lot-1', 'tenant-2'),
      ).resolves.toBeNull();
    });
  });

  describe('centroidByFarmAndTenant', () => {
    const reader = new PrismaLotLocationReader(prisma as never);

    it('averages the polygons of the farm lots inside the tenant', async () => {
      prisma.lot.findMany.mockResolvedValue([
        { coords: '[[-33.1,-64.4],[-33.2,-64.4]]' },
        { coords: '[[-33.3,-64.4],[-33.4,-64.4]]' },
        { coords: null },
      ]);

      const centroid = await reader.centroidByFarmAndTenant(
        'farm-1',
        'tenant-1',
      );

      expect(centroid).not.toBeNull();
      expect(centroid?.lat).toBeCloseTo(-33.25, 6);
      expect(centroid?.lon).toBeCloseTo(-64.4, 6);

      expect(prisma.lot.findMany).toHaveBeenCalledWith({
        where: { farmId: 'farm-1', farm: { client: { tenantId: 'tenant-1' } } },
        select: { coords: true },
      });
    });

    it('returns null when no lot of the farm has a usable polygon', async () => {
      prisma.lot.findMany.mockResolvedValue([{ coords: null }, { coords: '' }]);

      await expect(
        reader.centroidByFarmAndTenant('farm-1', 'tenant-1'),
      ).resolves.toBeNull();
    });
  });
});
