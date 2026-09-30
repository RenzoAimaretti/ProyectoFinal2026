import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DailyReportController } from './adapters/inbound/daily-report.controller';
import {
  DAILY_REPORT_APPROVAL,
  DAILY_REPORT_CLIENT_READER,
  DAILY_REPORT_CLOCK,
  DAILY_REPORT_COMPANY_READER,
  DAILY_REPORT_INPUT_READER,
  DAILY_REPORT_REPOSITORY,
  DAILY_REPORT_TASK_READER,
  ClockPort,
  DailyReportApprovalPort,
  DailyReportClientReaderPort,
  DailyReportCompanyReaderPort,
  DailyReportInputReaderPort,
  DailyReportRepositoryPort,
  DailyReportTaskReaderPort,
} from './application/daily-report.ports';
import { ApproveDailyReportUseCase } from './application/use-cases/approve-daily-report.use-case';
import { CreateDailyReportUseCase } from './application/use-cases/create-daily-report.use-case';
import { FindDailyReportUseCase } from './application/use-cases/find-daily-report.use-case';
import { FindDailyReportsByCompanyUseCase } from './application/use-cases/find-daily-reports-by-company.use-case';
import { PrismaDailyReportApprovalAdapter } from './adapters/outbound/prisma-daily-report-approval.adapter';
import { PrismaDailyReportClientReader } from './adapters/outbound/prisma-daily-report-client.reader';
import { PrismaDailyReportCompanyReader } from './adapters/outbound/prisma-company.reader';
import { PrismaDailyReportInputReader } from './adapters/outbound/prisma-daily-report-input.reader';
import { PrismaDailyReportRepository } from './adapters/outbound/prisma-daily-report.repository';
import { PrismaDailyReportTaskReader } from './adapters/outbound/prisma-task.reader';
import { DailyReportSystemClock } from './adapters/outbound/system-clock';

@Module({
  imports: [PrismaModule],
  controllers: [DailyReportController],
  providers: [
    PrismaDailyReportRepository,
    PrismaDailyReportCompanyReader,
    PrismaDailyReportTaskReader,
    PrismaDailyReportInputReader,
    PrismaDailyReportClientReader,
    PrismaDailyReportApprovalAdapter,
    DailyReportSystemClock,
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
      provide: DAILY_REPORT_CLIENT_READER,
      useExisting: PrismaDailyReportClientReader,
    },
    {
      provide: DAILY_REPORT_APPROVAL,
      useExisting: PrismaDailyReportApprovalAdapter,
    },
    { provide: DAILY_REPORT_CLOCK, useExisting: DailyReportSystemClock },
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
    {
      provide: ApproveDailyReportUseCase,
      useFactory: (
        repository: DailyReportRepositoryPort,
        clientReader: DailyReportClientReaderPort,
        approval: DailyReportApprovalPort,
        clock: ClockPort,
      ) =>
        new ApproveDailyReportUseCase(
          repository,
          clientReader,
          approval,
          clock,
        ),
      inject: [
        DAILY_REPORT_REPOSITORY,
        DAILY_REPORT_CLIENT_READER,
        DAILY_REPORT_APPROVAL,
        DAILY_REPORT_CLOCK,
      ],
    },
  ],
  exports: [
    FindDailyReportsByCompanyUseCase,
    FindDailyReportUseCase,
    CreateDailyReportUseCase,
    ApproveDailyReportUseCase,
  ],
})
export class DailyReportModule {}
