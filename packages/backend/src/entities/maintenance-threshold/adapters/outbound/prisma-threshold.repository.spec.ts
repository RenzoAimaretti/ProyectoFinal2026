import { PrismaThresholdRepository } from './prisma-threshold.repository';

describe('PrismaThresholdRepository', () => {
  const prisma = {
    maintenanceThreshold: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const repository = new PrismaThresholdRepository(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('reuses a case-insensitive match instead of creating a duplicate', async () => {
    prisma.maintenanceThreshold.findMany.mockResolvedValue([{ id: 'th-1' }]);
    prisma.maintenanceThreshold.update.mockResolvedValue({ id: 'th-1', machineType: 'Tractor', hoursLimit: 5 });
    prisma.maintenanceThreshold.deleteMany.mockResolvedValue({ count: 0 });

    await repository.upsert('company-1', ' tractor ', { hoursLimit: 5, hectaresLimit: null });

    expect(prisma.maintenanceThreshold.create).not.toHaveBeenCalled();
    expect(prisma.maintenanceThreshold.update).toHaveBeenCalledWith({
      where: { id: 'th-1' },
      data: { hoursLimit: 5, hectaresLimit: null },
    });
  });

  it('heals pre-existing duplicates by keeping one row and deleting the rest', async () => {
    prisma.maintenanceThreshold.findMany.mockResolvedValue([{ id: 'th-1' }, { id: 'th-2' }]);
    prisma.maintenanceThreshold.update.mockResolvedValue({ id: 'th-1' });
    prisma.maintenanceThreshold.deleteMany.mockResolvedValue({ count: 1 });

    await repository.upsert('company-1', 'Tractor', { hoursLimit: 9, hectaresLimit: null });

    expect(prisma.maintenanceThreshold.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['th-2'] } },
    });
  });

  it('creates when no equivalent type exists', async () => {
    prisma.maintenanceThreshold.findMany.mockResolvedValue([]);
    prisma.maintenanceThreshold.create.mockResolvedValue({ id: 'th-new' });

    await repository.upsert('company-1', ' Cosechadora ', { hoursLimit: null, hectaresLimit: 12 });

    expect(prisma.maintenanceThreshold.create).toHaveBeenCalledWith({
      data: { companyId: 'company-1', machineType: 'Cosechadora', hoursLimit: null, hectaresLimit: 12 },
    });
  });
});
