import { MachineUsageRepositoryPort } from '../machine-usage.ports';

export class FindMachineUsageUseCase {
  constructor(private readonly repository: MachineUsageRepositoryPort) {}

  execute(id: string) {
    return this.repository.findById(id);
  }
}
