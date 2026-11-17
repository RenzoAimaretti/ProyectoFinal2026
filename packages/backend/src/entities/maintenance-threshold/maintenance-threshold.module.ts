import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ALERT_MACHINE_READER, ALERT_USAGE_READER, AlertMachineReaderPort, AlertUsageReaderPort, THRESHOLD_REPOSITORY, ThresholdRepositoryPort } from './application/threshold.ports';
import { DeleteThresholdUseCase } from './application/use-cases/delete-threshold.use-case';
import { ListMachineAlertsUseCase } from './application/use-cases/list-machine-alerts.use-case';
import { ListThresholdsUseCase } from './application/use-cases/list-thresholds.use-case';
import { UpsertThresholdUseCase } from './application/use-cases/upsert-threshold.use-case';
import { PrismaAlertMachineReader, PrismaAlertUsageReader } from './adapters/outbound/prisma-alert.readers';
import { PrismaThresholdRepository } from './adapters/outbound/prisma-threshold.repository';
import { MaintenanceThresholdController, MachineAlertsController } from './maintenance-threshold.controller';
import { MaintenanceThresholdService } from './maintenance-threshold.service';

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceThresholdController, MachineAlertsController],
  providers: [
    MaintenanceThresholdService,
    { provide: THRESHOLD_REPOSITORY, useClass: PrismaThresholdRepository },
    { provide: ALERT_MACHINE_READER, useClass: PrismaAlertMachineReader },
    { provide: ALERT_USAGE_READER, useClass: PrismaAlertUsageReader },
    { provide: ListThresholdsUseCase, useFactory: (repo: ThresholdRepositoryPort) => new ListThresholdsUseCase(repo), inject: [THRESHOLD_REPOSITORY] },
    { provide: UpsertThresholdUseCase, useFactory: (repo: ThresholdRepositoryPort) => new UpsertThresholdUseCase(repo), inject: [THRESHOLD_REPOSITORY] },
    { provide: DeleteThresholdUseCase, useFactory: (repo: ThresholdRepositoryPort) => new DeleteThresholdUseCase(repo), inject: [THRESHOLD_REPOSITORY] },
    { provide: ListMachineAlertsUseCase, useFactory: (machines: AlertMachineReaderPort, thresholds: ThresholdRepositoryPort, usages: AlertUsageReaderPort) => new ListMachineAlertsUseCase(machines, thresholds, usages), inject: [ALERT_MACHINE_READER, THRESHOLD_REPOSITORY, ALERT_USAGE_READER] },
  ],
})
export class MaintenanceThresholdModule {}
