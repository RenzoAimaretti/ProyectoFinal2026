import { MarketSnapshot } from '../../domain/market-snapshot';
import { MarketPricePort } from '../ports/market-price.port';
import { GetMarketSnapshotUseCase } from './get-market-snapshot.use-case';

describe('GetMarketSnapshotUseCase', () => {
  it('returns one snapshot for the requested need', async () => {
    const snapshot: MarketSnapshot = {
      grainArsPerTon: {},
      usd: null,
      sources: { grains: null, usd: null },
      fetchedAt: { grains: null, usd: null },
      stale: { grains: false, usd: false },
    };
    const getSnapshot = jest.fn().mockResolvedValue(snapshot);
    const port: MarketPricePort = { getSnapshot };

    const result = await new GetMarketSnapshotUseCase(port).execute({
      grains: ['SOJA', 'MAIZ'],
      usd: true,
    });

    expect(result).toBe(snapshot);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(getSnapshot).toHaveBeenCalledWith({
      grains: ['SOJA', 'MAIZ'],
      usd: true,
      usdRateType: 'OFICIAL_VENTA',
    });
  });
});
