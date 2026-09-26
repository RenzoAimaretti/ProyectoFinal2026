import { ReceptionRepositoryPort } from '../reception.ports';
import { ReceptionRecord } from '../reception.types';
import { assertRequiredString } from '../reception.validation';

export class FindReceptionsByClientUseCase {
  constructor(private readonly repository: ReceptionRepositoryPort) {}

  async execute(clientId: string): Promise<ReceptionRecord[]> {
    const client = assertRequiredString(clientId, 'clientId');

    return this.repository.findAllByClient(client);
  }
}
