import { MachineUsageRepositoryPort } from '../machine-usage.ports';

export class FindAllMachineUsagesUseCase {
  constructor(private readonly repository: MachineUsageRepositoryPort) {}

  execute() {
    return this.repository.findAll();
  }
}
