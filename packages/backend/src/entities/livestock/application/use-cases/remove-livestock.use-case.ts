import { EntityNotFoundError } from '../../domain/errors';
import { LivestockRepositoryPort } from '../livestock.ports';
import { RemoveLivestockOutput } from '../livestock.types';

export class RemoveLivestockUseCase {
  constructor(private readonly repository: LivestockRepositoryPort) {}

  async execute(id: string): Promise<RemoveLivestockOutput> {
    const livestock = await this.repository.findById(id);

    if (!livestock) {
      throw new EntityNotFoundError(`Livestock with id ${id} not found`);
    }

    await this.repository.delete(id);

    return { message: `Livestock with id ${id} deleted successfully` };
  }
}
