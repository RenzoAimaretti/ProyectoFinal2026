import { EntityNotFoundError } from '../../domain/errors';
import { LaborTypeRepositoryPort } from '../labor-type.ports';

export class FindLaborTypeUseCase {
  constructor(private readonly repository: LaborTypeRepositoryPort) {}

  async execute(id: string, tenantId: string) {
    const laborType = await this.repository.findByIdForTenant(id, tenantId);

    if (!laborType) {
      throw new EntityNotFoundError(`Labor type with id ${id} not found`);
    }

    return laborType;
  }
}
