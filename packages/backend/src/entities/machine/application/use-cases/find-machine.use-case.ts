import { EntityNotFoundError } from '../../domain/errors';
import { MachineRepositoryPort } from '../machine.ports';

export class FindMachineUseCase {
  constructor(private readonly repository: MachineRepositoryPort) {}

  async execute(id: string, companyId: string) {
    const machine = await this.repository.findByIdForCompany(id, companyId);

    if (!machine) {
      throw new EntityNotFoundError(`Machine with id ${id} not found`);
    }

    return machine;
  }
}
