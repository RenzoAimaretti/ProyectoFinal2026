import { MachineRepositoryPort } from '../machine.ports';

export class FindMachineUseCase {
  constructor(private readonly repository: MachineRepositoryPort) {}

  execute(id: string) {
    return this.repository.findById(id);
  }
}
