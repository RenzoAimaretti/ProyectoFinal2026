import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { DuplicateUsageIdError } from '../../domain/errors';
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
        task: { lot: { farm: { client: { tenant: { companies: { some: { id: 'company-1' } } } } } } },
      },
    });
    expect(prisma.machineUsage.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'usage-1',
        machine: { companyId: 'company-1' },
        task: { lot: { farm: { client: { tenant: { companies: { some: { id: 'company-1' } } } } } } },
      },
    });
  });

  it('persists task-linked hours and hectares on create', async () => {
    prisma.machineUsage.create.mockResolvedValue({ id: 'usage-1', hectares: 7 });
    await expect(repository.create({ machineId: 'machine-1', taskId: 'task-1', usageHours: 2, hectares: 7 })).resolves.toEqual({ id: 'usage-1', hectares: 7 });
    expect(prisma.machineUsage.create).toHaveBeenCalledWith({ data: { machineId: 'machine-1', taskId: 'task-1', usageHours: 2, hectares: 7 } });
  });

  it('maps a duplicate client ID to a domain conflict while preserving the first row', async () => {
    const duplicate = new PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '7.8.0' });
    prisma.machineUsage.create.mockRejectedValue(duplicate);
    await expect(repository.create({ id: '41340853-9aa7-464c-98e7-6ea5d03faec1', machineId: 'machine-1', taskId: 'task-1', operatorId: 'user-1' })).rejects.toBeInstanceOf(DuplicateUsageIdError);
    expect(prisma.machineUsage.create).toHaveBeenCalledTimes(1);
  });

  it('writes updates after validating the company-scoped machine usage', async () => {
    prisma.machineUsage.findFirst.mockResolvedValue({ id: 'usage-1' });
    prisma.machineUsage.update.mockResolvedValue({ id: 'usage-1', finalFuel: 8 });

    await expect(
      repository.updateForCompany('usage-1', 'company-1', {
        initialFuel: 11,
        finalFuel: 8,
        usageHours: 2.5,
        hectares: 7,
        observations: 'updated',
      }),
    ).resolves.toEqual({ id: 'usage-1', finalFuel: 8 });

    expect(prisma.machineUsage.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'usage-1',
        machine: { companyId: 'company-1' },
        task: { lot: { farm: { client: { tenant: { companies: { some: { id: 'company-1' } } } } } } },
      },
      select: { id: true },
    });
    expect(prisma.machineUsage.update).toHaveBeenCalledWith({
      where: { id: 'usage-1' },
      data: {
        initialFuel: 11,
        finalFuel: 8,
        usageHours: 2.5,
        hectares: 7,
        observations: 'updated',
      },
    });
  });
});
