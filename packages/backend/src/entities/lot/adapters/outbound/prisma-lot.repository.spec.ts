import { PrismaLotRepository } from './prisma-lot.repository';

const square = {
  type: 'Polygon',
  coordinates: [
    [
      [-62.3, -33.4],
      [-62.2, -33.4],
      [-62.2, -33.3],
      [-62.3, -33.3],
      [-62.3, -33.4],
    ],
  ],
};

const row = {
  id: 'lot-1',
  farmId: 'farm-1',
  name: 'North pasture',
  coords: "33° 23' S · 62° 18' O",
  polygon: square,
  area: 12.5,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

describe('PrismaLotRepository', () => {
  const prisma = {
    lot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const repository = new PrismaLotRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes every read through the farm chain', async () => {
    prisma.lot.findMany.mockResolvedValue([row]);
    prisma.lot.findFirst.mockResolvedValue(row);

    await expect(repository.findAllByTenantId('tenant-1')).resolves.toEqual([
      row,
    ]);
    await expect(repository.findAllByClientId('client-1')).resolves.toEqual([
      row,
    ]);
    await expect(
      repository.findByIdForTenant('lot-1', 'tenant-1'),
    ).resolves.toEqual(row);
    await expect(
      repository.findByNameAndFarmId('North pasture', 'farm-1'),
    ).resolves.toEqual(row);

    expect(prisma.lot.findMany).toHaveBeenCalledWith({
      where: { farm: { client: { tenantId: 'tenant-1' } } },
    });
    expect(prisma.lot.findMany).toHaveBeenCalledWith({
      where: { farm: { clientId: 'client-1' } },
    });
    expect(prisma.lot.findFirst).toHaveBeenCalledWith({
      where: { id: 'lot-1', farm: { client: { tenantId: 'tenant-1' } } },
    });
    expect(prisma.lot.findFirst).toHaveBeenCalledWith({
      where: { name: 'North pasture', farmId: 'farm-1' },
    });
  });

  it('reports a lot that is outside the tenant as null', async () => {
    prisma.lot.findFirst.mockResolvedValue(null);

    await expect(
      repository.findByIdForTenant('lot-1', 'tenant-2'),
    ).resolves.toBeNull();
    await expect(
      repository.findByNameAndFarmId('North pasture', 'farm-1'),
    ).resolves.toBeNull();
  });

  it('returns a stored polygon as the validated geometry', async () => {
    prisma.lot.findFirst.mockResolvedValue(row);

    const lot = await repository.findByIdForTenant('lot-1', 'tenant-1');

    expect(lot?.polygon).toEqual(square);
  });

  it('reports a lot that has no polygon yet as null', async () => {
    prisma.lot.findFirst.mockResolvedValue({ ...row, polygon: null });

    const lot = await repository.findByIdForTenant('lot-1', 'tenant-1');

    expect(lot?.polygon).toBeNull();
  });

  it('writes the keys the caller sent and omits the ones it did not', async () => {
    prisma.lot.create.mockResolvedValue(row);

    await repository.create({
      name: 'North pasture',
      farmId: 'farm-1',
      polygon: square,
      area: 12.5,
    });
    await repository.create({
      name: 'North pasture',
      farmId: 'farm-1',
      area: 12.5,
    });

    expect(prisma.lot.create).toHaveBeenNthCalledWith(1, {
      data: {
        name: 'North pasture',
        farmId: 'farm-1',
        polygon: square,
        area: 12.5,
      },
    });
    expect(prisma.lot.create).toHaveBeenNthCalledWith(2, {
      data: { name: 'North pasture', farmId: 'farm-1', area: 12.5 },
    });
  });

  it('keeps the legacy coords string alongside a polygon', async () => {
    prisma.lot.create.mockResolvedValue(row);

    await repository.create({
      name: 'North pasture',
      farmId: 'farm-1',
      coords: "33° 23' S · 62° 18' O",
      polygon: square,
      area: 12.5,
    });

    expect(prisma.lot.create).toHaveBeenCalledWith({
      data: {
        name: 'North pasture',
        farmId: 'farm-1',
        coords: "33° 23' S · 62° 18' O",
        polygon: square,
        area: 12.5,
      },
    });
  });

  it('refuses to update a lot outside the tenant and writes nothing', async () => {
    prisma.lot.findFirst.mockResolvedValue(null);

    await expect(
      repository.updateForTenant('lot-1', 'tenant-2', { name: 'South pasture' }),
    ).rejects.toThrow('Lot with id lot-1 not found for tenant tenant-2');

    expect(prisma.lot.update).not.toHaveBeenCalled();
  });

  it('updates the polygon and returns the mapped record', async () => {
    prisma.lot.findFirst.mockResolvedValue({ id: 'lot-1' });
    prisma.lot.update.mockResolvedValue({ ...row, polygon: square });

    await expect(
      repository.updateForTenant('lot-1', 'tenant-1', { polygon: square }),
    ).resolves.toEqual({ ...row, polygon: square });

    expect(prisma.lot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: { polygon: square },
    });
  });
});
