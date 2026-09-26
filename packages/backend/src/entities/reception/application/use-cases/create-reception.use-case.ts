import { InvalidRelationError } from '../../domain/errors';
import { RECEPTION_INITIAL_STATUS } from '../../domain/reception-status';
import {
  ReceptionClientReaderPort,
  ReceptionInputReaderPort,
  ReceptionRepositoryPort,
} from '../reception.ports';
import { CreateReceptionInput, ReceptionRecord } from '../reception.types';
import {
  assertRequiredDate,
  assertRequiredString,
  normalizeReceptionItems,
  resolveCatalogueUnits,
} from '../reception.validation';

export class CreateReceptionUseCase {
  constructor(
    private readonly repository: ReceptionRepositoryPort,
    private readonly clientReader: ReceptionClientReaderPort,
    private readonly inputReader: ReceptionInputReaderPort,
  ) {}

  async execute(
    clientId: string,
    data: CreateReceptionInput,
  ): Promise<ReceptionRecord> {
    const client = assertRequiredString(clientId, 'clientId');
    const date = assertRequiredDate(data.date, 'date');
    const declaredItems = normalizeReceptionItems(data.items);

    const clientRecord = await this.clientReader.findById(client);
    if (!clientRecord) {
      throw new InvalidRelationError(`Client with id ${client} not found`);
    }

    const catalogue = await this.inputReader.findExistingForTenant(
      declaredItems.map((item) => item.inputId),
      clientRecord.tenantId,
    );

    return this.repository.create({
      clientId: client,
      date,
      status: RECEPTION_INITIAL_STATUS,
      items: resolveCatalogueUnits(declaredItems, catalogue),
    });
  }
}
