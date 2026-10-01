import { MachineActivityRepositoryPort } from '../machine-activity.ports';
import { MachineActivityRecord } from '../machine-activity.types';
import { assertRequiredString } from '../machine-activity.validation';

export class FindAllMachineActivitiesUseCase {
  constructor(private readonly repository: MachineActivityRepositoryPort) {}

  async execute(companyId: string): Promise<MachineActivityRecord[]> {
    const company = assertRequiredString(companyId, 'companyId');

    return this.repository.findAllByCompany(company);
  }
}
