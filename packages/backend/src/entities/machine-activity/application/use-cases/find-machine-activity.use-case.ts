import { EntityNotFoundError } from '../../domain/errors';
import { MachineActivityRepositoryPort } from '../machine-activity.ports';
import { MachineActivityRecord } from '../machine-activity.types';
import { assertRequiredString } from '../machine-activity.validation';

export class FindMachineActivityUseCase {
  constructor(private readonly repository: MachineActivityRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<MachineActivityRecord> {
    const activityId = assertRequiredString(id, 'id');
    const company = assertRequiredString(companyId, 'companyId');

    const activity = await this.repository.findByIdForCompany(
      activityId,
      company,
    );

    if (!activity) {
      throw new EntityNotFoundError(
        `Machine activity with id ${activityId} not found`,
      );
    }

    return activity;
  }
}
