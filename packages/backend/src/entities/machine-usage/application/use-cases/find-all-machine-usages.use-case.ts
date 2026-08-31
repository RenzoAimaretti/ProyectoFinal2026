import { MachineUsageRepositoryPort } from '../machine-usage.ports';

export class FindAllMachineUsagesUseCase {
  constructor(private readonly repository: MachineUsageRepositoryPort) {}

  execute(companyId: string) {
    return this.repository.findAllByCompanyId(companyId);
  }
}
