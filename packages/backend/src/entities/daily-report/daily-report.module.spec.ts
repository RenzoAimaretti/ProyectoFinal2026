import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DAILY_REPORT_COMPANY_READER,
  DAILY_REPORT_INPUT_READER,
  DAILY_REPORT_REPOSITORY,
  DAILY_REPORT_TASK_READER,
} from './application/daily-report.ports';
import { CreateDailyReportUseCase } from './application/use-cases/create-daily-report.use-case';
import { FindDailyReportUseCase } from './application/use-cases/find-daily-report.use-case';
import { FindDailyReportsByCompanyUseCase } from './application/use-cases/find-daily-reports-by-company.use-case';
import { DailyReportModule } from './daily-report.module';

describe('DailyReportModule', () => {
  it('wires every daily report use case through its ports', async () => {
    const repository = {
      create: jest.fn(),
      findByIdForCompany: jest.fn().mockResolvedValue(null),
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

    await expect(
      moduleRef.get(FindDailyReportsByCompanyUseCase).execute('company-1'),
    ).resolves.toEqual([]);
    expect(repository.findAllByCompany).toHaveBeenCalledWith('company-1');
  });
});
