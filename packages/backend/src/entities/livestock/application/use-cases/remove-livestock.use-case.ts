import { EntityNotFoundError } from '../../domain/errors';
import { LivestockRepositoryPort } from '../livestock.ports';
import { RemoveLivestockOutput } from '../livestock.types';

export class RemoveLivestockUseCase {
  constructor(private readonly repository: LivestockRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<RemoveLivestockOutput> {
    const livestock = await this.repository.findByIdForCompany(id, companyId);

    if (!livestock) {
      throw new EntityNotFoundError(`Livestock with id ${id} not found`);
    }

    await this.repository.deleteForCompany(id, companyId);

    return { message: `Livestock with id ${id} deleted successfully` };
  }
}
