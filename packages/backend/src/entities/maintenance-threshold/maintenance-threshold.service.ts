import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DeleteThresholdUseCase } from './application/use-cases/delete-threshold.use-case';
import { ListMachineAlertsUseCase } from './application/use-cases/list-machine-alerts.use-case';
import { ListThresholdsUseCase } from './application/use-cases/list-thresholds.use-case';
import { UpsertThresholdUseCase } from './application/use-cases/upsert-threshold.use-case';
import { InvalidThresholdError, ThresholdNotFoundError } from './application/threshold.validation';

@Injectable()
export class MaintenanceThresholdService {
  constructor(
    private readonly listUseCase: ListThresholdsUseCase,
    private readonly upsertUseCase: UpsertThresholdUseCase,
    private readonly deleteUseCase: DeleteThresholdUseCase,
    private readonly alertsUseCase: ListMachineAlertsUseCase,
  ) {}
  findAll(companyId: string) { return this.handle(() => this.listUseCase.execute(companyId)); }
  upsert(companyId: string, machineType: string, body: unknown) { return this.handle(() => this.upsertUseCase.execute(companyId, machineType, body)); }
  remove(companyId: string, machineType: string) { return this.handle(() => this.deleteUseCase.execute(companyId, machineType)); }
  alerts(companyId: string) { return this.handle(() => this.alertsUseCase.execute(companyId)); }
  private async handle<T>(run: () => Promise<T>): Promise<T> {
    try { return await run(); }
    catch (error) {
      if (error instanceof InvalidThresholdError) throw new BadRequestException(error.message);
      if (error instanceof ThresholdNotFoundError) throw new NotFoundException(error.message);
      throw new InternalServerErrorException('Maintenance threshold operation failed');
    }
  }
}
