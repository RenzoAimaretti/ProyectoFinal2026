import { EntityNotFoundError } from '../../domain/errors';
import { TariffRepositoryPort } from '../ports/tariff-repository.port';

export class DeleteTariffUseCase {
  constructor(private readonly tariffs: TariffRepositoryPort) {}

  async execute(input: {
    companyId: string;
    laborTypeId: string;
  }): Promise<void> {
    const deleted = await this.tariffs.deleteByPair(
      input.companyId,
      input.laborTypeId,
    );
    if (!deleted) {
      throw new EntityNotFoundError('Tariff not found');
    }
  }
}
