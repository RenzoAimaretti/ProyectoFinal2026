import { EntityNotFoundError } from '../../domain/errors';
import { LivestockEventRepositoryPort } from '../livestock-event.ports';
import { LivestockEventRecord } from '../livestock-event.types';

export class FindLivestockEventUseCase {
  constructor(private readonly repository: LivestockEventRepositoryPort) {}

  async execute(id: string, companyId?: string): Promise<LivestockEventRecord> {
    const event = companyId
      ? await this.repository.findByIdForCompany(id, companyId)
      : await this.repository.findById(id);

    if (!event) {
      throw new EntityNotFoundError(`Livestock event with id ${id} not found`);
    }

    return event;
  }
}
