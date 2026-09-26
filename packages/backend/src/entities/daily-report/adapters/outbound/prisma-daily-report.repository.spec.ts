import {
  CreateDailyReportData,
  DailyReportRecord,
} from '../../application/daily-report.types';
import { PrismaDailyReportRepository } from './prisma-daily-report.repository';

const persistedReport = {
  id: 'report-1',
  operatorId: 'user-1',
  companyId: 'company-1',
  taskId: 'task-1',
  lotId: 'lot-1',
  taskTypeId: 'task-type-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  hectares: 12.5,
  hours: 6,
  status: 'PENDIENTE_APROBACION',
  rejectionReason: null,
  approvedAt: null,
  approvedBy: null,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  items: [
    {
      id: 'item-1',
      dailyReportId: 'report-1',
      inputId: 'input-1',
      quantity: 10,
      unit: 'L',
    },
    {
      id: 'item-2',
      dailyReportId: 'report-1',
      inputId: 'input-2',
      quantity: 4,
      unit: 'kg',
    },
  ],
};

const expectedRecord: DailyReportRecord = {
  id: 'report-1',
  operatorId: 'user-1',
  companyId: 'company-1',
  taskId: 'task-1',
  lotId: 'lot-1',
  taskTypeId: 'task-type-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  hectares: 12.5,
  hours: 6,
  status: 'PENDIENTE_APROBACION',
  rejectionReason: null,
  approvedAt: null,
  approvedBy: null,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  items: [
    {
      id: 'item-1',
      dailyReportId: 'report-1',
      inputId: 'input-1',
      quantity: 10,
      unit: 'L',
    },
    {
      id: 'item-2',
      dailyReportId: 'report-1',
      inputId: 'input-2',
      quantity: 4,
      unit: 'kg',
    },
  ],
};

const itemOrderBy = { orderBy: [{ id: 'asc' }] };

describe('PrismaDailyReportRepository', () => {
  const prisma = {
    dailyReport: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const repository = new PrismaDailyReportRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists the report header and its items in a single aggregate write scoped to the company', async () => {
    const data: CreateDailyReportData = {
      operatorId: 'user-1',
      companyId: 'company-1',
      taskId: 'task-1',
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      date: new Date('2026-03-01T00:00:00.000Z'),
      hectares: 12.5,
      hours: 6,
      status: 'PENDIENTE_APROBACION',
      items: [
        { inputId: 'input-1', quantity: 10, unit: 'L' },
        { inputId: 'input-2', quantity: 4, unit: 'kg' },
      ],
    };
    prisma.dailyReport.create.mockResolvedValue(persistedReport);

    await expect(repository.create(data)).resolves.toEqual(expectedRecord);

    expect(prisma.dailyReport.create).toHaveBeenCalledWith({
      data: {
        operatorId: 'user-1',
        companyId: 'company-1',
        taskId: 'task-1',
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        date: new Date('2026-03-01T00:00:00.000Z'),
        hectares: 12.5,
        hours: 6,
        status: 'PENDIENTE_APROBACION',
        items: {
          create: [
            { inputId: 'input-1', quantity: 10, unit: 'L' },
            { inputId: 'input-2', quantity: 4, unit: 'kg' },
          ],
        },
      },
      include: { items: itemOrderBy },
    });
  });

  it('scopes the report read directly by company id', async () => {
    prisma.dailyReport.findFirst.mockResolvedValue(persistedReport);

    await expect(
      repository.findByIdForCompany('report-1', 'company-1'),
    ).resolves.toEqual(expectedRecord);

    expect(prisma.dailyReport.findFirst).toHaveBeenCalledWith({
      where: { id: 'report-1', companyId: 'company-1' },
      include: { items: itemOrderBy },
    });
  });

  it('returns null when the report belongs to another company', async () => {
    prisma.dailyReport.findFirst.mockResolvedValue(null);

    await expect(
      repository.findByIdForCompany('report-1', 'company-2'),
    ).resolves.toBeNull();
  });

  it('lists the reports of a company with a deterministic order', async () => {
    prisma.dailyReport.findMany.mockResolvedValue([persistedReport]);

    await expect(repository.findAllByCompany('company-1')).resolves.toEqual([
      expectedRecord,
    ]);

    expect(prisma.dailyReport.findMany).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      include: { items: itemOrderBy },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });
  });

  it('returns an empty list when the company owns no report', async () => {
    prisma.dailyReport.findMany.mockResolvedValue([]);

    await expect(repository.findAllByCompany('company-2')).resolves.toEqual([]);
  });
});
