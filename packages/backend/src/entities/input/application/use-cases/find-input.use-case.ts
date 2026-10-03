import { EntityNotFoundError } from '../../domain/errors';
import { InputRepositoryPort } from '../input.ports';
import { InputRecord } from '../input.types';

export class FindInputUseCase {
  constructor(private readonly repository: InputRepositoryPort) {}

  async execute(id: string, tenantId: string): Promise<InputRecord> {
    const input = await this.repository.findByIdForTenant(id, tenantId);

    if (!input) {
      throw new EntityNotFoundError(`Input with id ${id} not found`);
    }

    return input;
  }
}
