import { MachineRepositoryPort } from '../machine.ports';

export class FindAllMachinesUseCase {
  constructor(private readonly repository: MachineRepositoryPort) {}

  execute(companyId: string) {
    return this.repository.findAllByCompanyId(companyId);
  }
}
