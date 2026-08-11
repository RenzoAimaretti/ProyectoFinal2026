import { MachineRepositoryPort } from '../machine.ports';

export class FindAllMachinesUseCase {
  constructor(private readonly repository: MachineRepositoryPort) {}

  execute() {
    return this.repository.findAll();
  }
}
