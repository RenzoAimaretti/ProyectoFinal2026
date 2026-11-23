import { Dec } from '../../domain/decimal';
import { InvalidMoneyError, MarketUnavailableError } from '../../domain/errors';
import { MarketSnapshot } from '../../domain/market-snapshot';
import { MarketNeed, MarketPricePort } from '../ports/market-price.port';
import { ValueMoneyUseCase } from './value-money.use-case';

const FETCHED = new Date('2026-11-23T12:00:00Z');

function snapshot(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    grainArsPerTon: { SOJA: Dec.parse('310000'), TRIGO: null },
    usd: {
      oficialVenta: Dec.parse('1580'),
      oficialCompra: Dec.parse('1540'),
      bnaPizarra: null,
    },
    sources: { grains: 'cac.bcr.com.ar', usd: 'dolarapi.com' },
    fetchedAt: { grains: FETCHED, usd: FETCHED },
    stale: { grains: false, usd: false },
    ...overrides,
  };
}

function harness(market: MarketSnapshot = snapshot()) {
  const needs: MarketNeed[] = [];
  const getSnapshot = jest.fn((need: MarketNeed) => {
    needs.push(need);
    return Promise.resolve(market);
  });
  const port: MarketPricePort = {
    getSnapshot: getSnapshot,
  };
  return { useCase: new ValueMoneyUseCase(port), getSnapshot, needs };
}

describe('ValueMoneyUseCase', () => {
  it('values kilos of cereal and records the grain price, source and fetch time', async () => {
    const { useCase, needs } = harness();

    const result = await useCase.execute({
      amount: '600',
      unit: 'KG_CEREAL',
      grain: 'SOJA',
    });

    expect(result).toEqual({
      amountArs: '186000.00',
      grainArsPerTon: '310000',
      usdRate: null,
      usdRateType: null,
      grainSource: 'cac.bcr.com.ar',
      usdSource: null,
      priceFetchedAt: FETCHED,
      priceStale: false,
    });
    expect(needs).toEqual([
      { grains: ['SOJA'], usd: false, usdRateType: 'OFICIAL_VENTA' },
    ]);
  });

  it('values USD with the policy rate and records the rate type', async () => {
    const { useCase, needs } = harness();

    const result = await useCase.execute({
      amount: '100',
      unit: 'USD',
      grain: null,
    });

    expect(result.amountArs).toBe('158000.00');
    expect(result.usdRate).toBe('1580');
    expect(result.usdRateType).toBe('OFICIAL_VENTA');
    expect(result.usdSource).toBe('dolarapi.com');
    expect(result.grainArsPerTon).toBeNull();
    expect(needs).toEqual([
      { grains: [], usd: true, usdRateType: 'OFICIAL_VENTA' },
    ]);
  });

  it('does not query the market for an ARS amount', async () => {
    const { useCase, getSnapshot } = harness();

    const result = await useCase.execute({
      amount: '1500.555',
      unit: 'ARS',
      grain: null,
    });

    expect(result.amountArs).toBe('1500.56');
    expect(result.priceFetchedAt).toBeNull();
    expect(result.priceStale).toBe(false);
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it('accepts a stale price (decision D26) and flags it', async () => {
    const stale = snapshot({ stale: { grains: true, usd: false } });
    const { useCase } = harness(stale);

    const result = await useCase.execute({
      amount: '10',
      unit: 'KG_CEREAL',
      grain: 'SOJA',
    });

    expect(result.priceStale).toBe(true);
    expect(result.amountArs).toBe('3100.00');
  });

  it('fails with a market error, not zero, when the grain has no price ("S/C")', async () => {
    const { useCase } = harness();

    await expect(
      useCase.execute({ amount: '10', unit: 'KG_CEREAL', grain: 'TRIGO' }),
    ).rejects.toBeInstanceOf(MarketUnavailableError);
  });

  it('fails with a market error when the usd provider is down', async () => {
    const { useCase } = harness(snapshot({ usd: null }));

    await expect(
      useCase.execute({ amount: '10', unit: 'USD', grain: null }),
    ).rejects.toBeInstanceOf(MarketUnavailableError);
  });

  it('rejects an invalid money before touching the market', async () => {
    const { useCase, getSnapshot } = harness();

    await expect(
      useCase.execute({ amount: '10', unit: 'KG_CEREAL', grain: null }),
    ).rejects.toBeInstanceOf(InvalidMoneyError);
    expect(getSnapshot).not.toHaveBeenCalled();
  });
});
