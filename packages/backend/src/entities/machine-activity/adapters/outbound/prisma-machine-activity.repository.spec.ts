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
  fuelMovement: 'INCOME',
  date: new Date('2026-03-09T00:00:00.000Z'),
  liters: 120,
  receipt: 'A-0001',
  hasReceipt: false,
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
      updateMany: jest.fn(),
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

    expect(prisma.machineActivity.create).toHaveBeenCalledWith({
      data: { ...data, fuelMovement: 'INCOME' },
    });
  });

  it('keeps consumption distinct on read without rewriting legacy income', async () => {
    prisma.machineActivity.findMany.mockResolvedValue([
      { ...persistedActivity, id: 'legacy-1', fuelMovement: null },
      { ...persistedActivity, id: 'consumption-1', fuelMovement: 'CONSUMPTION' },
    ]);

    const records = await repository.findAllByCompany('company-1');
    expect(records.map((row) => row.fuelMovement)).toEqual(['INCOME', 'CONSUMPTION']);
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

  it('attaches a receipt once with a conditional company and type scoped update', async () => {
    prisma.machineActivity.updateMany.mockResolvedValue({ count: 1 });
    await expect(repository.attachReceiptIfAbsent('activity-1', 'company-1', 'key-1', 'application/pdf')).resolves.toBe(true);
    expect(prisma.machineActivity.updateMany).toHaveBeenCalledWith({
      where: { id: 'activity-1', companyId: 'company-1', type: 'COMBUSTIBLE', receiptFileKey: null },
      data: { receiptFileKey: 'key-1', receiptMimeType: 'application/pdf' },
    });
    prisma.machineActivity.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.attachReceiptIfAbsent('activity-1', 'company-2', 'key-2', 'application/pdf')).resolves.toBe(false);
  });

  it('loads only scoped fuel receipt metadata and never exposes the file key on activity reads', async () => {
    prisma.machineActivity.findFirst.mockResolvedValue({ receiptFileKey: 'key-1', receiptMimeType: 'application/pdf' });
    await expect(repository.findReceiptForCompany('activity-1', 'company-1')).resolves.toEqual({ key: 'key-1', mimeType: 'application/pdf' });
    expect(prisma.machineActivity.findFirst).toHaveBeenCalledWith({
      where: { id: 'activity-1', companyId: 'company-1', type: 'COMBUSTIBLE' },
      select: { receiptFileKey: true, receiptMimeType: true },
    });
    prisma.machineActivity.findFirst.mockResolvedValue({ ...persistedActivity, receiptFileKey: 'key-1' });
    const row = await repository.findByIdForCompany('activity-1', 'company-1');
    expect(row).toEqual(expect.objectContaining({ hasReceipt: true }));
    expect(row).not.toHaveProperty('receiptFileKey');
  });

  it('returns an empty list when the company has no activity', async () => {
    prisma.machineActivity.findMany.mockResolvedValue([]);

    await expect(repository.findAllByCompany('company-2')).resolves.toEqual([]);
  });
});
