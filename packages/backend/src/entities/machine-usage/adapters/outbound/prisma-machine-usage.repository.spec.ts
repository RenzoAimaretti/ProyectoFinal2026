import { PrismaMachineUsageRepository } from './prisma-machine-usage.repository';

describe('PrismaMachineUsageRepository', () => {
  const prisma = {
    machineUsage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const repository: any = new PrismaMachineUsageRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list and reads through machine and task company relations', async () => {
    prisma.machineUsage.findMany.mockResolvedValue([{ id: 'usage-1' }]);
    prisma.machineUsage.findFirst.mockResolvedValue({ id: 'usage-1' });

    await expect(repository.findAllByCompanyId('company-1')).resolves.toEqual([
      { id: 'usage-1' },
    ]);
    await expect(repository.findByIdForCompany('usage-1', 'company-1')).resolves.toEqual({
      id: 'usage-1',
    });

    expect(prisma.machineUsage.findMany).toHaveBeenCalledWith({
      where: {
        machine: { companyId: 'company-1' },
        task: { lot: { farm: { companyId: 'company-1' } } },
      },
    });
    expect(prisma.machineUsage.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'usage-1',
        machine: { companyId: 'company-1' },
        task: { lot: { farm: { companyId: 'company-1' } } },
      },
    });
  });

  it('writes updates after validating the company-scoped machine usage', async () => {
    prisma.machineUsage.findFirst.mockResolvedValue({ id: 'usage-1' });
    prisma.machineUsage.update.mockResolvedValue({ id: 'usage-1', finalFuel: 8 });

    await expect(
      repository.updateForCompany('usage-1', 'company-1', {
        initialFuel: 11,
        finalFuel: 8,
        usageHours: 2.5,
        observations: 'updated',
      }),
    ).resolves.toEqual({ id: 'usage-1', finalFuel: 8 });

    expect(prisma.machineUsage.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'usage-1',
        machine: { companyId: 'company-1' },
        task: { lot: { farm: { companyId: 'company-1' } } },
      },
      select: { id: true },
    });
    expect(prisma.machineUsage.update).toHaveBeenCalledWith({
      where: { id: 'usage-1' },
      data: {
        initialFuel: 11,
        finalFuel: 8,
        usageHours: 2.5,
        observations: 'updated',
      },
    });
  });
});
