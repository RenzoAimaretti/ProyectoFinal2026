import { buildStockBalanceSummary } from '../../domain/stock.rules';
import { StockBalanceSummaryReaderPort } from '../stock.ports';
import { StockBalanceSummaryItem } from '../stock.types';
import { assertRequiredString } from '../stock.validation';

export class FindStockBalanceSummaryUseCase {
  constructor(private readonly reader: StockBalanceSummaryReaderPort) {}

  async execute(clientId: string): Promise<StockBalanceSummaryItem[]> {
    const client = assertRequiredString(clientId, 'clientId');
    const data = await this.reader.readClientSummaryData(client);
    return buildStockBalanceSummary(data);
  }
}
