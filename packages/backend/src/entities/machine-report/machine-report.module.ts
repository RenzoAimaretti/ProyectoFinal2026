import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MACHINE_REPORT_REPOSITORY, MachineReportRepositoryPort } from './application/machine-report.ports';
import { ConsolidatedReportUseCase } from './application/use-cases/consolidated-report.use-case';
import { PrismaMachineReportRepository } from './adapters/outbound/prisma-machine-report.repository';
import { MachineReportController } from './machine-report.controller';
import { MachineReportService } from './machine-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [MachineReportController],
  providers: [
    MachineReportService,
    { provide: MACHINE_REPORT_REPOSITORY, useClass: PrismaMachineReportRepository },
    { provide: ConsolidatedReportUseCase, useFactory: (repository: MachineReportRepositoryPort) => new ConsolidatedReportUseCase(repository), inject: [MACHINE_REPORT_REPOSITORY] },
  ],
})
export class MachineReportModule {}
