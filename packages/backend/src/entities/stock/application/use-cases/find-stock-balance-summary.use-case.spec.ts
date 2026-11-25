import { StockBalanceSummaryReaderPort } from '../stock.ports';
import { InvalidInputError } from '../../domain/errors';
import { FindStockBalanceSummaryUseCase } from './find-stock-balance-summary.use-case';

describe('FindStockBalanceSummaryUseCase', () => {
  let reader: jest.Mocked<StockBalanceSummaryReaderPort>;
  let useCase: FindStockBalanceSummaryUseCase;

  beforeEach(() => {
    reader = {
      readClientSummaryData: jest.fn(),
    };
    useCase = new FindStockBalanceSummaryUseCase(reader);
  });

  it('rejects a missing clientId', async () => {
    await expect(useCase.execute('')).rejects.toThrow(InvalidInputError);
    expect(reader.readClientSummaryData).not.toHaveBeenCalled();
  });

  it('returns the aggregated summary for a valid clientId', async () => {
    reader.readClientSummaryData.mockResolvedValue({
      stocks: [{ inputId: 'in-1', inputName: 'Glifosato', unit: 'L', quantity: 50 }],
      received: [{ inputId: 'in-1', inputName: 'Glifosato', unit: 'L', quantity: 70 }],
      consumed: [{ inputId: 'in-1', inputName: 'Glifosato', unit: 'L', quantity: 20 }],
      planned: [{ inputId: 'in-1', inputName: 'Glifosato', unit: 'L', quantity: 30 }],
    });

    await expect(useCase.execute('client-1')).resolves.toEqual([
      {
        inputId: 'in-1',
        inputName: 'Glifosato',
        unit: 'L',
        receivedQuantity: 70,
        consumedQuantity: 20,
        availableQuantity: 50,
        plannedQuantity: 30,
        netVsPlanned: 20,
        status: 'SOBRANTE',
      },
    ]);
    expect(reader.readClientSummaryData).toHaveBeenCalledWith('client-1');
  });
});
