import {
  EntityNotFoundError,
  InsufficientStockError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import { ApproveDailyReportData } from '../../application/daily-report.types';
import { PrismaDailyReportApprovalAdapter } from './prisma-daily-report-approval.adapter';

const approvalDate = new Date('2026-05-04T12:00:00.000Z');

const enrichedInclude = {
  items: { orderBy: [{ id: 'asc' }], include: { input: { select: { name: true } } } },
  company: { select: { name: true } },
  operator: { select: { username: true, email: true } },
  laborType: { select: { name: true } },
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

const pendingReport = {
  id: 'report-1',
  operatorId: 'user-1',
  companyId: 'company-1',
  taskId: 'task-1',
  lotId: 'lot-1',
  laborTypeId: 'labor-type-1',
  date: new Date('2026-05-03T00:00:00.000Z'),
  hectares: 12.5,
  hours: 6,
  status: 'PENDIENTE_APROBACION',
  rejectionReason: null,
  approvedAt: null,
  approvedBy: null,
  createdAt: new Date('2026-05-03T10:00:00.000Z'),
  updatedAt: new Date('2026-05-03T10:00:00.000Z'),
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

const data: ApproveDailyReportData = {
  id: 'report-1',
  companyId: 'company-1',
  clientId: 'client-1',
  approvedBy: 'user-1',
  approvedAt: approvalDate,
};

describe('PrismaDailyReportApprovalAdapter', () => {
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
    dailyReport: { updateMany: jest.fn() },
    stock: { updateMany: jest.fn() },
  };

  const adapter = new PrismaDailyReportApprovalAdapter(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.dailyReport.findFirst.mockResolvedValue(pendingReport);
    tx.dailyReport.updateMany.mockResolvedValue({ count: 1 });
    tx.dailyReport.findFirstOrThrow.mockResolvedValue({
      ...pendingReport,
      status: 'APROBADO',
      approvedBy: 'user-1',
      approvedAt: approvalDate,
    });
    tx.stock.findUnique.mockResolvedValue({
      id: 'stock-1',
      clientId: 'client-1',
      inputId: 'input-1',
      quantity: 100,
    });
    tx.stock.updateMany.mockResolvedValue({ count: 1 });
  });

  it('runs the approval and every stock deduction inside one transaction', async () => {
    await adapter.approveWithStockDeduction(data);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.dailyReport.updateMany).not.toHaveBeenCalled();
    expect(prisma.stock.updateMany).not.toHaveBeenCalled();
  });

  it('reads the report inside the company scope', async () => {
    await adapter.approveWithStockDeduction(data);

    expect(tx.dailyReport.findFirst).toHaveBeenCalledWith({
      where: { id: 'report-1', companyId: 'company-1' },
      include: enrichedInclude,
    });
  });

  it('deducts every consumed input from the client stock with a sufficiency guard', async () => {
    await adapter.approveWithStockDeduction(data);

    expect(tx.stock.findUnique).toHaveBeenNthCalledWith(1, {
      where: { clientId_inputId: { clientId: 'client-1', inputId: 'input-1' } },
    });
    expect(tx.stock.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        clientId: 'client-1',
        inputId: 'input-1',
        quantity: { gte: 10 },
      },
      data: { quantity: { decrement: 10 } },
    });
    expect(tx.stock.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        clientId: 'client-1',
        inputId: 'input-2',
        quantity: { gte: 4 },
      },
      data: { quantity: { decrement: 4 } },
    });
  });

  it('never partitions the deduction by company', async () => {
    await adapter.approveWithStockDeduction(data);

    const calls = JSON.stringify([
      ...tx.stock.findUnique.mock.calls,
      ...tx.stock.updateMany.mock.calls,
    ]);

    expect(calls).not.toContain('companyId');
  });

  it('marks the report approved through a pending guarded company-scoped write', async () => {
    const record = await adapter.approveWithStockDeduction(data);

    expect(tx.dailyReport.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'report-1',
        companyId: 'company-1',
        status: 'PENDIENTE_APROBACION',
      },
      data: {
        status: 'APROBADO',
        approvedBy: 'user-1',
        approvedAt: approvalDate,
      },
    });
    expect(record).toEqual({
      ...pendingReport,
      status: 'APROBADO',
      approvedBy: 'user-1',
      approvedAt: approvalDate,
    });
  });

  it('fails without deducting when the report is not visible for the company', async () => {
    tx.dailyReport.findFirst.mockResolvedValue(null);

    await expect(
      adapter.approveWithStockDeduction(data),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    expect(tx.stock.updateMany).not.toHaveBeenCalled();
    expect(tx.dailyReport.updateMany).not.toHaveBeenCalled();
  });

  it('fails without deducting when the report was already decided', async () => {
    tx.dailyReport.findFirst.mockResolvedValue({
      ...pendingReport,
      status: 'APROBADO',
    });

    await expect(
      adapter.approveWithStockDeduction(data),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);

    expect(tx.stock.updateMany).not.toHaveBeenCalled();
    expect(tx.dailyReport.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ['the client has no stock row', null],
    [
      'the stored balance is lower than the consumed quantity',
      { id: 'stock-1', clientId: 'client-1', inputId: 'input-1', quantity: 4 },
    ],
  ])('rejects the approval when %s', async (_label, balance) => {
    tx.stock.findUnique.mockResolvedValue(balance);

    const rejection = adapter.approveWithStockDeduction(data);

    await expect(rejection).rejects.toBeInstanceOf(InsufficientStockError);
    await expect(rejection).rejects.toMatchObject({
      clientId: 'client-1',
      inputId: 'input-1',
      required: 10,
      available: balance?.quantity ?? 0,
    });

    expect(tx.stock.updateMany).not.toHaveBeenCalled();
    expect(tx.dailyReport.updateMany).not.toHaveBeenCalled();
  });

  it('fails when a concurrent movement empties the balance before the guarded deduction', async () => {
    tx.stock.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      adapter.approveWithStockDeduction(data),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    expect(tx.dailyReport.updateMany).not.toHaveBeenCalled();
  });

  it('fails when a concurrent approval wins the guarded status write', async () => {
    tx.dailyReport.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      adapter.approveWithStockDeduction(data),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);

    expect(tx.dailyReport.findFirstOrThrow).not.toHaveBeenCalled();
  });

  it('returns the enriched names resolved by the approval read', async () => {
    tx.dailyReport.findFirstOrThrow.mockResolvedValue({
      ...pendingReport,
      status: 'APROBADO',
      approvedBy: 'user-1',
      approvedAt: approvalDate,
      company: { name: 'Firma SA' },
      operator: { username: null, email: 'operador@agro.com' },
      laborType: { name: 'Pulverizacion' },
      task: {
        lot: {
          name: 'Lote 1',
          farm: { name: 'Campo Norte', client: { name: 'Cliente X' } },
        },
      },
      approver: { username: 'admin', email: 'admin@agro.com' },
      items: [
        { ...pendingReport.items[0], input: { name: 'Glifosato' } },
        pendingReport.items[1],
      ],
    });

    const record = await adapter.approveWithStockDeduction(data);

    expect(record).toMatchObject({
      companyName: 'Firma SA',
      operatorName: 'operador@agro.com',
      laborTypeName: 'Pulverizacion',
      lotName: 'Lote 1',
      farmName: 'Campo Norte',
      clientName: 'Cliente X',
      approvedByName: 'admin',
    });
    expect(record.items[0].inputName).toBe('Glifosato');
    expect(record.items[1].inputName).toBeUndefined();
  });
});
