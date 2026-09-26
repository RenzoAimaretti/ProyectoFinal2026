import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DAILY_REPORT_APPROVAL,
  DAILY_REPORT_CLIENT_READER,
  DAILY_REPORT_CLOCK,
  DAILY_REPORT_COMPANY_READER,
  DAILY_REPORT_INPUT_READER,
  DAILY_REPORT_REPOSITORY,
  DAILY_REPORT_TASK_READER,
} from './application/daily-report.ports';
import { ApproveDailyReportUseCase } from './application/use-cases/approve-daily-report.use-case';
import { CreateDailyReportUseCase } from './application/use-cases/create-daily-report.use-case';
import { FindDailyReportUseCase } from './application/use-cases/find-daily-report.use-case';
import { FindDailyReportsByCompanyUseCase } from './application/use-cases/find-daily-reports-by-company.use-case';
import { DailyReportModule } from './daily-report.module';

describe('DailyReportModule', () => {
  it('wires every daily report use case through its ports', async () => {
    const repository = {
      create: jest.fn(),
      findByIdForCompany: jest.fn().mockResolvedValue({
        id: 'report-1',
        lotId: 'lot-1',
        status: 'PENDIENTE_APROBACION',
        items: [],
      }),
      findAllByCompany: jest.fn().mockResolvedValue([]),
    };
    const companyReader = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'company-1', tenantId: 'tenant-1' }),
    };
    const taskReader = {
      findByIdWithScope: jest.fn().mockResolvedValue({
        id: 'task-1',
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        tenantId: 'tenant-1',
      }),
    };
    const inputReader = {
      findExistingIdsForTenant: jest.fn().mockResolvedValue([]),
    };
    const clientReader = {
      findClientIdByLotId: jest.fn().mockResolvedValue('client-1'),
    };
    const approval = {
      approveWithStockDeduction: jest
        .fn()
        .mockResolvedValue({ id: 'report-1', status: 'APROBADO', items: [] }),
    };
    const clock = { now: jest.fn().mockReturnValue(new Date()) };

    const moduleRef = await Test.createTestingModule({
      imports: [DailyReportModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(DAILY_REPORT_REPOSITORY)
      .useValue(repository)
      .overrideProvider(DAILY_REPORT_COMPANY_READER)
      .useValue(companyReader)
      .overrideProvider(DAILY_REPORT_TASK_READER)
      .useValue(taskReader)
      .overrideProvider(DAILY_REPORT_INPUT_READER)
      .useValue(inputReader)
      .overrideProvider(DAILY_REPORT_CLIENT_READER)
      .useValue(clientReader)
      .overrideProvider(DAILY_REPORT_APPROVAL)
      .useValue(approval)
      .overrideProvider(DAILY_REPORT_CLOCK)
      .useValue(clock)
      .compile();

    expect(moduleRef.get(FindDailyReportsByCompanyUseCase)).toBeInstanceOf(
      FindDailyReportsByCompanyUseCase,
    );
    expect(moduleRef.get(FindDailyReportUseCase)).toBeInstanceOf(
      FindDailyReportUseCase,
    );
    expect(moduleRef.get(CreateDailyReportUseCase)).toBeInstanceOf(
      CreateDailyReportUseCase,
    );
    expect(moduleRef.get(ApproveDailyReportUseCase)).toBeInstanceOf(
      ApproveDailyReportUseCase,
    );

    await expect(
      moduleRef.get(FindDailyReportsByCompanyUseCase).execute('company-1'),
    ).resolves.toEqual([]);
    expect(repository.findAllByCompany).toHaveBeenCalledWith('company-1');

    await expect(
      moduleRef
        .get(ApproveDailyReportUseCase)
        .execute('company-1', 'report-1', 'user-1'),
    ).resolves.toEqual({ id: 'report-1', status: 'APROBADO', items: [] });
    expect(approval.approveWithStockDeduction).toHaveBeenCalledWith({
      id: 'report-1',
      companyId: 'company-1',
      clientId: 'client-1',
      approvedBy: 'user-1',
      approvedAt: expect.any(Date),
    });
  });
});
