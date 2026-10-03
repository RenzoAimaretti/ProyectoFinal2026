import {
  MachineActivityRecord,
  RegisterMachineActivityData,
} from '../../application/machine-activity.types';
import { PrismaMachineActivityRepository } from './prisma-machine-activity.repository';

const persistedActivity = {
  id: 'activity-1',
  machineId: 'machine-1',
  companyId: 'company-1',
  type: 'COMBUSTIBLE',
  date: new Date('2026-03-09T00:00:00.000Z'),
  liters: 120,
  receipt: 'A-0001',
  cost: null,
  spareParts: null,
  usageHours: null,
  hectares: null,
  observations: null,
  createdAt: new Date('2026-03-09T10:00:00.000Z'),
  updatedAt: new Date('2026-03-09T10:00:00.000Z'),
};

const expectedRecord: MachineActivityRecord = {
  id: 'activity-1',
  machineId: 'machine-1',
  companyId: 'company-1',
  type: 'COMBUSTIBLE',
  date: new Date('2026-03-09T00:00:00.000Z'),
  liters: 120,
  receipt: 'A-0001',
  cost: null,
  spareParts: null,
  usageHours: null,
  hectares: null,
  observations: null,
  createdAt: new Date('2026-03-09T10:00:00.000Z'),
  updatedAt: new Date('2026-03-09T10:00:00.000Z'),
};

describe('PrismaMachineActivityRepository', () => {
  const prisma = {
    machineActivity: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const repository = new PrismaMachineActivityRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists the activity with the company that bears the cost', async () => {
    const data: RegisterMachineActivityData = {
      machineId: 'machine-1',
      companyId: 'company-1',
      type: 'COMBUSTIBLE',
      date: new Date('2026-03-09T00:00:00.000Z'),
      liters: 120,
      receipt: 'A-0001',
      cost: null,
      spareParts: null,
      usageHours: null,
      hectares: null,
      observations: null,
    };
    prisma.machineActivity.create.mockResolvedValue(persistedActivity);

    await expect(repository.create(data)).resolves.toEqual(expectedRecord);

    expect(prisma.machineActivity.create).toHaveBeenCalledWith({ data });
  });

  it('scopes the activity read directly by company id', async () => {
    prisma.machineActivity.findFirst.mockResolvedValue(persistedActivity);

    await expect(
      repository.findByIdForCompany('activity-1', 'company-1'),
    ).resolves.toEqual(expectedRecord);

    expect(prisma.machineActivity.findFirst).toHaveBeenCalledWith({
      where: { id: 'activity-1', companyId: 'company-1' },
    });
  });

  it('returns null when the activity belongs to another company', async () => {
    prisma.machineActivity.findFirst.mockResolvedValue(null);

    await expect(
      repository.findByIdForCompany('activity-1', 'company-2'),
    ).resolves.toBeNull();
  });

  it('lists the activities of a company ordered by date', async () => {
    prisma.machineActivity.findMany.mockResolvedValue([persistedActivity]);

    await expect(repository.findAllByCompany('company-1')).resolves.toEqual([
      expectedRecord,
    ]);

    expect(prisma.machineActivity.findMany).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });
  });

  it('returns an empty list when the company has no activity', async () => {
    prisma.machineActivity.findMany.mockResolvedValue([]);

    await expect(repository.findAllByCompany('company-2')).resolves.toEqual([]);
  });
});
