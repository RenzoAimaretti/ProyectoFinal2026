import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  DAILY_REPORT_COMPANY_READER,
  DAILY_REPORT_INPUT_READER,
  DAILY_REPORT_REPOSITORY,
  DAILY_REPORT_TASK_READER,
  DailyReportCompanyReaderPort,
  DailyReportInputReaderPort,
  DailyReportRepositoryPort,
  DailyReportTaskReaderPort,
} from './application/daily-report.ports';
import { CreateDailyReportUseCase } from './application/use-cases/create-daily-report.use-case';
import { FindDailyReportUseCase } from './application/use-cases/find-daily-report.use-case';
import { FindDailyReportsByCompanyUseCase } from './application/use-cases/find-daily-reports-by-company.use-case';
import { PrismaDailyReportCompanyReader } from './adapters/outbound/prisma-company.reader';
import { PrismaDailyReportInputReader } from './adapters/outbound/prisma-daily-report-input.reader';
import { PrismaDailyReportRepository } from './adapters/outbound/prisma-daily-report.repository';
import { PrismaDailyReportTaskReader } from './adapters/outbound/prisma-task.reader';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaDailyReportRepository,
    PrismaDailyReportCompanyReader,
    PrismaDailyReportTaskReader,
    PrismaDailyReportInputReader,
    { provide: DAILY_REPORT_REPOSITORY, useExisting: PrismaDailyReportRepository },
    {
      provide: DAILY_REPORT_COMPANY_READER,
      useExisting: PrismaDailyReportCompanyReader,
    },
    { provide: DAILY_REPORT_TASK_READER, useExisting: PrismaDailyReportTaskReader },
    {
      provide: DAILY_REPORT_INPUT_READER,
      useExisting: PrismaDailyReportInputReader,
    },
    {
      provide: FindDailyReportsByCompanyUseCase,
      useFactory: (repository: DailyReportRepositoryPort) =>
        new FindDailyReportsByCompanyUseCase(repository),
      inject: [DAILY_REPORT_REPOSITORY],
    },
    {
      provide: FindDailyReportUseCase,
      useFactory: (repository: DailyReportRepositoryPort) =>
        new FindDailyReportUseCase(repository),
      inject: [DAILY_REPORT_REPOSITORY],
    },
    {
      provide: CreateDailyReportUseCase,
      useFactory: (
        repository: DailyReportRepositoryPort,
        companyReader: DailyReportCompanyReaderPort,
        taskReader: DailyReportTaskReaderPort,
        inputReader: DailyReportInputReaderPort,
      ) =>
        new CreateDailyReportUseCase(
          repository,
          companyReader,
          taskReader,
          inputReader,
        ),
      inject: [
        DAILY_REPORT_REPOSITORY,
        DAILY_REPORT_COMPANY_READER,
        DAILY_REPORT_TASK_READER,
        DAILY_REPORT_INPUT_READER,
      ],
    },
  ],
  exports: [
    FindDailyReportsByCompanyUseCase,
    FindDailyReportUseCase,
    CreateDailyReportUseCase,
  ],
})
export class DailyReportModule {}
