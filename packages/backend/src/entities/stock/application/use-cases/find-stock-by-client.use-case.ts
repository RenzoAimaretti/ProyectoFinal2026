import { StockRepositoryPort } from '../stock.ports';
import { StockRecord } from '../stock.types';
import { assertRequiredString } from '../stock.validation';

export class FindStockByClientUseCase {
  constructor(private readonly repository: StockRepositoryPort) {}

  async execute(clientId: string): Promise<StockRecord[]> {
    const client = assertRequiredString(clientId, 'clientId');

    return this.repository.findAllByClient(client);
  }
}
