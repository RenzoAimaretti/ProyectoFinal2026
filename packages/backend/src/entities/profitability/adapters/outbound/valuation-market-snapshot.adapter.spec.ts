import { GetMarketSnapshotUseCase } from '../../../valuation/application/use-cases/get-market-snapshot.use-case';
import { marketSnapshot } from '../../../valuation/application/valuation.test-fakes';
import { ValuationMarketSnapshotAdapter } from './valuation-market-snapshot.adapter';

describe('ValuationMarketSnapshotAdapter', () => {
  it('delegates the need to the valuation use case and returns its photo', async () => {
    const photo = marketSnapshot();
    const execute = jest.fn().mockResolvedValue(photo);
    const adapter = new ValuationMarketSnapshotAdapter({
      execute,
    } as unknown as GetMarketSnapshotUseCase);

    await expect(
      adapter.getSnapshot({ grains: ['SOJA'], usd: true }),
    ).resolves.toBe(photo);
    expect(execute).toHaveBeenCalledWith({ grains: ['SOJA'], usd: true });
  });

  it('propagates the failure of the market', async () => {
    const adapter = new ValuationMarketSnapshotAdapter({
      execute: jest.fn().mockRejectedValue(new Error('down')),
    } as unknown as GetMarketSnapshotUseCase);

    await expect(
      adapter.getSnapshot({ grains: [], usd: true }),
    ).rejects.toThrow('down');
  });
});
