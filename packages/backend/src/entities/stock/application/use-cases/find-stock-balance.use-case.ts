import { resolveStockBalance } from '../../domain/stock.rules';
import { StockRepositoryPort } from '../stock.ports';
import { StockBalance } from '../stock.types';
import { assertRequiredString } from '../stock.validation';

export class FindStockBalanceUseCase {
  constructor(private readonly repository: StockRepositoryPort) {}

  async execute(clientId: string, inputId: string): Promise<StockBalance> {
    const client = assertRequiredString(clientId, 'clientId');
    const input = assertRequiredString(inputId, 'inputId');

    const stock = await this.repository.findByClientAndInput(client, input);

    return resolveStockBalance(client, input, stock?.quantity ?? null);
  }
}
