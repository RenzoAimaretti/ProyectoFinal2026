import {
  EntityNotFoundError,
  InsufficientStockError,
  InvalidInputError,
  InvalidRelationError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import {
  ClockPort,
  DailyReportApprovalPort,
  DailyReportClientReaderPort,
  DailyReportRepositoryPort,
  DailyReportValuationHookPort,
} from '../daily-report.ports';
import {
  ApproveDailyReportData,
  DailyReportRecord,
} from '../daily-report.types';
import { ApproveDailyReportUseCase } from './approve-daily-report.use-case';

const approvalDate = new Date('2026-05-04T12:00:00.000Z');

const pendingReport: DailyReportRecord = {
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
  ],
};

function createRepository(): jest.Mocked<DailyReportRepositoryPort> {
  return {
    create: jest.fn(),
    findByIdForCompany: jest.fn(),
    findAllByCompany: jest.fn(),
    reject: jest.fn(),
  };
}

function createClientReader(): jest.Mocked<DailyReportClientReaderPort> {
  return { findClientIdByLotId: jest.fn() };
}

function createApproval(): jest.Mocked<DailyReportApprovalPort> {
  return { approveWithStockDeduction: jest.fn() };
}

function createHook(): jest.Mocked<DailyReportValuationHookPort> {
  return { onApproved: jest.fn().mockResolvedValue(undefined) };
}

function createClock(): jest.Mocked<ClockPort> {
  return { now: jest.fn().mockReturnValue(approvalDate) };
}

describe('ApproveDailyReportUseCase', () => {
  let repository: jest.Mocked<DailyReportRepositoryPort>;
  let clientReader: jest.Mocked<DailyReportClientReaderPort>;
  let approval: jest.Mocked<DailyReportApprovalPort>;
  let clock: jest.Mocked<ClockPort>;
  let valuationHook: jest.Mocked<DailyReportValuationHookPort>;
  let useCase: ApproveDailyReportUseCase;

  beforeEach(() => {
    repository = createRepository();
    clientReader = createClientReader();
    approval = createApproval();
    clock = createClock();
    valuationHook = createHook();
    useCase = new ApproveDailyReportUseCase(
      repository,
      clientReader,
      approval,
      clock,
      valuationHook,
    );
    repository.findByIdForCompany.mockResolvedValue(pendingReport);
    clientReader.findClientIdByLotId.mockResolvedValue('client-1');
  });

  it.each([
    ['an empty company id', '  ', 'report-1', 'user-1'],
    ['an empty report id', 'company-1', '  ', 'user-1'],
    ['an empty approver id', 'company-1', 'report-1', '   '],
  ])(
    'rejects %s before touching any port',
    async (_label, companyId, reportId, approvedBy) => {
      await expect(
        useCase.execute(companyId, reportId, approvedBy),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(repository.findByIdForCompany).not.toHaveBeenCalled();
      expect(clientReader.findClientIdByLotId).not.toHaveBeenCalled();
      expect(approval.approveWithStockDeduction).not.toHaveBeenCalled();
      expect(valuationHook.onApproved).not.toHaveBeenCalled();
    },
  );

  it('rejects a report that does not exist inside the company scope', async () => {
    repository.findByIdForCompany.mockResolvedValue(null);

    await expect(
      useCase.execute('company-1', 'report-1', 'user-1'),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    expect(repository.findByIdForCompany).toHaveBeenCalledWith(
      'report-1',
      'company-1',
    );
    expect(clientReader.findClientIdByLotId).not.toHaveBeenCalled();
    expect(approval.approveWithStockDeduction).not.toHaveBeenCalled();
    expect(valuationHook.onApproved).not.toHaveBeenCalled();
  });

  it.each(['APROBADO', 'RECHAZADO'] as const)(
    'rejects a report already decided as %s',
    async (status) => {
      repository.findByIdForCompany.mockResolvedValue({
        ...pendingReport,
        status,
      });

      await expect(
        useCase.execute('company-1', 'report-1', 'user-1'),
      ).rejects.toBeInstanceOf(InvalidStateTransitionError);

      expect(approval.approveWithStockDeduction).not.toHaveBeenCalled();
      expect(valuationHook.onApproved).not.toHaveBeenCalled();
      expect(valuationHook.onApproved).not.toHaveBeenCalled();
    },
  );

  it('rejects a report whose lot is not linked to a client', async () => {
    clientReader.findClientIdByLotId.mockResolvedValue(null);

    await expect(
      useCase.execute('company-1', 'report-1', 'user-1'),
    ).rejects.toBeInstanceOf(InvalidRelationError);

    expect(clientReader.findClientIdByLotId).toHaveBeenCalledWith('lot-1');
    expect(approval.approveWithStockDeduction).not.toHaveBeenCalled();
    expect(valuationHook.onApproved).not.toHaveBeenCalled();
  });

  it('approves with the resolved client scope and the current time', async () => {
    const approved: DailyReportRecord = {
      ...pendingReport,
      status: 'APROBADO',
      approvedBy: 'user-1',
      approvedAt: approvalDate,
    };
    const expected: ApproveDailyReportData = {
      id: 'report-1',
      companyId: 'company-1',
      clientId: 'client-1',
      approvedBy: 'user-1',
      approvedAt: approvalDate,
    };
    approval.approveWithStockDeduction.mockResolvedValue(approved);

    await expect(
      useCase.execute('company-1', 'report-1', 'user-1'),
    ).resolves.toEqual(approved);

    expect(approval.approveWithStockDeduction).toHaveBeenCalledWith(expected);
    expect(clock.now).toHaveBeenCalled();
  });

  it('hands the approved report to the valuation hook only after the approval transaction resolved', async () => {
    const order: string[] = [];
    const approved: DailyReportRecord = {
      ...pendingReport,
      status: 'APROBADO',
      approvedBy: 'user-1',
      approvedAt: approvalDate,
    };
    approval.approveWithStockDeduction.mockImplementation(() => {
      order.push('approval-started');
      return Promise.resolve().then(() => {
        order.push('approval-committed');
        return approved;
      });
    });
    valuationHook.onApproved.mockImplementation(() => {
      order.push('hook');
      return Promise.resolve();
    });

    await expect(
      useCase.execute('company-1', 'report-1', 'user-1'),
    ).resolves.toBe(approved);

    expect(order).toEqual(['approval-started', 'approval-committed', 'hook']);
    expect(valuationHook.onApproved).toHaveBeenCalledTimes(1);
    expect(valuationHook.onApproved).toHaveBeenCalledWith({
      companyId: 'company-1',
      reportId: 'report-1',
      approvedAt: approvalDate,
    });
  });

  it('answers the very same approved report when the valuation hook breaks its contract and throws', async () => {
    const approved: DailyReportRecord = {
      ...pendingReport,
      status: 'APROBADO',
      approvedBy: 'user-1',
      approvedAt: approvalDate,
    };
    approval.approveWithStockDeduction.mockResolvedValue(approved);
    valuationHook.onApproved.mockRejectedValue(new Error('valuation exploded'));

    await expect(
      useCase.execute('company-1', 'report-1', 'user-1'),
    ).resolves.toBe(approved);

    expect(valuationHook.onApproved).toHaveBeenCalledTimes(1);
    expect(approval.approveWithStockDeduction).toHaveBeenCalledTimes(1);
  });

  it('falls back to the clock time when the approved report carries no approval date', async () => {
    const approved: DailyReportRecord = {
      ...pendingReport,
      status: 'APROBADO',
      approvedBy: 'user-1',
      approvedAt: null,
    };
    approval.approveWithStockDeduction.mockResolvedValue(approved);

    await useCase.execute('company-1', 'report-1', 'user-1');

    expect(valuationHook.onApproved).toHaveBeenCalledWith({
      companyId: 'company-1',
      reportId: 'report-1',
      approvedAt: approvalDate,
    });
  });

  it('propagates an insufficient stock rejection from the approval port', async () => {
    approval.approveWithStockDeduction.mockRejectedValue(
      new InsufficientStockError('client-1', 'input-1', 10, 4),
    );

    await expect(
      useCase.execute('company-1', 'report-1', 'user-1'),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    expect(valuationHook.onApproved).not.toHaveBeenCalled();
  });
});
