import { EntityNotFoundError } from '../../domain/errors';
import { LaborTypeRepositoryPort } from '../labor-type.ports';
import { RemoveLaborTypeOutput } from '../labor-type.types';

export class DeleteLaborTypeUseCase {
  constructor(private readonly repository: LaborTypeRepositoryPort) {}

  async execute(id: string, tenantId: string): Promise<RemoveLaborTypeOutput> {
    const existing = await this.repository.findByIdForTenant(id, tenantId);

    if (!existing) {
      throw new EntityNotFoundError(`Labor type with id ${id} not found`);
    }

    await this.repository.deleteForTenant(id, tenantId);

    return { message: `Labor type with id ${id} deleted successfully` };
  }
}
