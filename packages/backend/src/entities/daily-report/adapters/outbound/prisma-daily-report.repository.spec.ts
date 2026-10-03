import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
  CreateDailyReportData,
  DailyReportRecord,
} from '../../application/daily-report.types';
import {
  EntityNotFoundError,
  InvalidStateTransitionError,
} from '../../domain/errors';
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

/**
 * The enriched read joins the display names of the report. It is asserted
 * verbatim so the contract cannot silently lose a relation.
 */
const enrichedInclude = {
  items: { orderBy: [{ id: 'asc' }], include: { input: { select: { name: true } } } },
  company: { select: { name: true } },
  operator: { select: { username: true, email: true } },
  taskType: { select: { name: true } },
  task: {
    select: {
      lot: {
        select: {
          name: true,
          farm: {
            select: {
              name: true,
              client: { select: { name: true } },
            },
          },
        },
      },
    },
  },
  approver: { select: { username: true, email: true } },
};

describe('PrismaDailyReportRepository', () => {
  const tx = {
    dailyReport: {
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    stock: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    dailyReport: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    stock: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const repository = new PrismaDailyReportRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
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
      include: enrichedInclude,
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
      include: enrichedInclude,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });
  });

  it('returns an empty list when the company owns no report', async () => {
    prisma.dailyReport.findMany.mockResolvedValue([]);

    await expect(repository.findAllByCompany('company-2')).resolves.toEqual([]);
  });

  it('passes an explicit client id through to the Prisma create call', async () => {
    const data: CreateDailyReportData = {
      id: 'client-uuid-1',
      operatorId: 'user-1',
      companyId: 'company-1',
      taskId: 'task-1',
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      date: new Date('2026-03-01T00:00:00.000Z'),
      hectares: 5,
      hours: 3,
      status: 'PENDIENTE_APROBACION',
      items: [{ inputId: 'input-1', quantity: 2, unit: 'kg' }],
    };
    prisma.dailyReport.create.mockResolvedValue({
      ...persistedReport,
      id: 'client-uuid-1',
    });

    await expect(repository.create(data)).resolves.toEqual({
      ...expectedRecord,
      id: 'client-uuid-1',
    });

    expect(prisma.dailyReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: 'client-uuid-1' }),
      }),
    );
  });

  it('lets Prisma generate an id when the client does not provide one', async () => {
    const data: CreateDailyReportData = {
      operatorId: 'user-1',
      companyId: 'company-1',
      taskId: 'task-1',
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      date: new Date('2026-03-01T00:00:00.000Z'),
      hectares: 5,
      hours: 3,
      status: 'PENDIENTE_APROBACION',
      items: [{ inputId: 'input-1', quantity: 2, unit: 'kg' }],
    };
    prisma.dailyReport.create.mockResolvedValue(persistedReport);

    await expect(repository.create(data)).resolves.toEqual(expectedRecord);

    expect(prisma.dailyReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: undefined }),
      }),
    );
  });

  it('returns the existing report when a P2002 duplicate is caught', async () => {
    const duplicateError = new PrismaClientKnownRequestError(
      'Unique constraint failed on the id',
      { code: 'P2002', clientVersion: '7.8.0' },
    );
    prisma.dailyReport.create.mockRejectedValue(duplicateError);
    prisma.dailyReport.findFirst.mockResolvedValue(persistedReport);

    const data: CreateDailyReportData = {
      id: 'report-1',
      operatorId: 'user-1',
      companyId: 'company-1',
      taskId: 'task-1',
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      date: new Date('2026-03-01T00:00:00.000Z'),
      hectares: 5,
      hours: 3,
      status: 'PENDIENTE_APROBACION',
      items: [{ inputId: 'input-1', quantity: 2, unit: 'kg' }],
    };

    await expect(repository.create(data)).resolves.toEqual(expectedRecord);

    expect(prisma.dailyReport.findFirst).toHaveBeenCalledWith({
      where: { id: 'report-1', companyId: 'company-1' },
      include: enrichedInclude,
    });
  });

  it('rethrows a P2002 on a different column when id is not provided', async () => {
    const duplicateError = new PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.8.0' },
    );
    prisma.dailyReport.create.mockRejectedValue(duplicateError);

    const data: CreateDailyReportData = {
      operatorId: 'user-1',
      companyId: 'company-1',
      taskId: 'task-1',
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      date: new Date('2026-03-01T00:00:00.000Z'),
      hectares: 5,
      hours: 3,
      status: 'PENDIENTE_APROBACION',
      items: [{ inputId: 'input-1', quantity: 2, unit: 'kg' }],
    };

    await expect(repository.create(data)).rejects.toThrow(duplicateError);

    expect(prisma.dailyReport.findFirst).not.toHaveBeenCalled();
  });

  it('rethrows non-P2002 Prisma errors unchanged', async () => {
    const otherError = new PrismaClientKnownRequestError(
      'Table does not exist',
      { code: 'P2021', clientVersion: '7.8.0' },
    );
    prisma.dailyReport.create.mockRejectedValue(otherError);

    const data: CreateDailyReportData = {
      id: 'report-1',
      operatorId: 'user-1',
      companyId: 'company-1',
      taskId: 'task-1',
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      date: new Date('2026-03-01T00:00:00.000Z'),
      hectares: 5,
      hours: 3,
      status: 'PENDIENTE_APROBACION',
      items: [{ inputId: 'input-1', quantity: 2, unit: 'kg' }],
    };

    await expect(repository.create(data)).rejects.toThrow(otherError);
  });

  describe('reject', () => {
    const rejectData = {
      id: 'report-1',
      companyId: 'company-1',
      rejectionReason: 'fuera de fecha',
    };

    beforeEach(() => {
      tx.dailyReport.findFirst.mockResolvedValue(persistedReport);
      tx.dailyReport.updateMany.mockResolvedValue({ count: 1 });
      tx.dailyReport.findFirstOrThrow.mockResolvedValue({
        ...persistedReport,
        status: 'RECHAZADO',
        rejectionReason: 'fuera de fecha',
      });
    });

    it('writes the terminal status and reason atomically with a pending guard and no stock movement', async () => {
      const result = await repository.reject(rejectData);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.dailyReport.findFirst).toHaveBeenCalledWith({
        where: { id: 'report-1', companyId: 'company-1' },
        include: enrichedInclude,
      });
      expect(tx.dailyReport.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'report-1',
          companyId: 'company-1',
          status: 'PENDIENTE_APROBACION',
        },
        data: {
          status: 'RECHAZADO',
          rejectionReason: 'fuera de fecha',
        },
      });
      expect(tx.dailyReport.findFirstOrThrow).toHaveBeenCalledWith({
        where: { id: 'report-1', companyId: 'company-1' },
        include: enrichedInclude,
      });
      expect(tx.stock.updateMany).not.toHaveBeenCalled();
      expect(prisma.stock.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        ...expectedRecord,
        status: 'RECHAZADO',
        rejectionReason: 'fuera de fecha',
      });
    });

    it('fails without writing when the report is not visible for the company', async () => {
      tx.dailyReport.findFirst.mockResolvedValue(null);

      await expect(repository.reject(rejectData)).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(tx.dailyReport.updateMany).not.toHaveBeenCalled();
    });

    it('fails without writing when the report was already decided', async () => {
      tx.dailyReport.findFirst.mockResolvedValue({
        ...persistedReport,
        status: 'APROBADO',
      });

      await expect(repository.reject(rejectData)).rejects.toBeInstanceOf(
        InvalidStateTransitionError,
      );

      expect(tx.dailyReport.updateMany).not.toHaveBeenCalled();
    });

    it('fails when a concurrent decision wins the guarded status write', async () => {
      tx.dailyReport.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.reject(rejectData)).rejects.toBeInstanceOf(
        InvalidStateTransitionError,
      );

      expect(tx.dailyReport.findFirstOrThrow).not.toHaveBeenCalled();
    });
  });
});
