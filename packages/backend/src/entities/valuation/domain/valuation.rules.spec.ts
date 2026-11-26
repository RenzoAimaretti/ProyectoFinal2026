import { Dec } from './decimal';
import { Money } from './money';
import { MarketSnapshot } from './market-snapshot';
import { convertToArs, toArs } from './valuation.rules';

const market = (overrides: Partial<MarketSnapshot> = {}): MarketSnapshot => ({
  grainArsPerTon: { SOJA: Dec.parse('310000'), TRIGO: null },
  usd: {
    oficialVenta: Dec.parse('1580'),
    oficialCompra: Dec.parse('1540'),
    bnaPizarra: Dec.parse('1504'),
  },
  sources: { grains: 'cac.bcr.com.ar', usd: 'dolarapi.com' },
  fetchedAt: {
    grains: new Date('2026-11-23T12:00:00Z'),
    usd: new Date('2026-11-23T12:00:00Z'),
  },
  stale: { grains: false, usd: false },
  ...overrides,
});

const money = (
  amount: string,
  unit: Money['unit'],
  grain: Money['grain'] = null,
): Money => ({
  amount: Dec.parse(amount),
  unit,
  grain,
});

describe('toArs', () => {
  it('converts kilos of cereal with the board price per ton divided by 1000', () => {
    expect(toArs(money('600', 'KG_CEREAL', 'SOJA'), market())?.toString()).toBe(
      '186000.00',
    );
  });

  it('converts USD with the policy rate (oficial venta)', () => {
    expect(toArs(money('100', 'USD'), market())?.toString()).toBe('158000.00');
  });

  it('uses the rate of another policy without touching the rule', () => {
    expect(
      toArs(money('100', 'USD'), market(), 'OFICIAL_COMPRA')?.toString(),
    ).toBe('154000.00');
  });

  it('passes ARS through, rounded to 2 decimals half up', () => {
    expect(toArs(money('1000.005', 'ARS'), market())?.toString()).toBe(
      '1000.01',
    );
  });

  it('does not need the market for ARS', () => {
    expect(
      toArs(
        money('50', 'ARS'),
        market({ usd: null, grainArsPerTon: {} }),
      )?.toString(),
    ).toBe('50.00');
  });

  it('returns null (never 0) when the grain price is not available', () => {
    expect(toArs(money('600', 'KG_CEREAL', 'TRIGO'), market())).toBeNull();
  });

  it('returns null when the grain was not requested from the market', () => {
    expect(toArs(money('600', 'KG_CEREAL', 'MAIZ'), market())).toBeNull();
  });

  it('returns null when the usd rate is unavailable', () => {
    expect(toArs(money('100', 'USD'), market({ usd: null }))).toBeNull();
  });

  it('values a zero amount at zero when the price exists', () => {
    expect(toArs(money('0', 'KG_CEREAL', 'SOJA'), market())?.toString()).toBe(
      '0.00',
    );
  });

  it('rounds the kilos conversion to 2 decimals half up', () => {
    const cheap = market({ grainArsPerTon: { SOJA: Dec.parse('310001') } });
    const half = market({ grainArsPerTon: { SOJA: Dec.parse('310010') } });
    // 1 kg * 310001 / 1000 = 310.001 -> 310.00 ; 0.5 kg * 310010 / 1000 = 155.005 -> 155.01
    expect(toArs(money('1', 'KG_CEREAL', 'SOJA'), cheap)?.toString()).toBe(
      '310.00',
    );
    expect(toArs(money('0.5', 'KG_CEREAL', 'SOJA'), half)?.toString()).toBe(
      '155.01',
    );
  });
});

describe('convertToArs', () => {
  it('records the grain price used for kilos', () => {
    const result = convertToArs(money('600', 'KG_CEREAL', 'SOJA'), market());
    expect(result?.grainArsPerTon?.toString()).toBe('310000');
    expect(result?.usdRate).toBeNull();
    expect(result?.usdRateType).toBeNull();
    expect(result?.ars.toString()).toBe('186000.00');
  });

  it('records the usd rate and rate type used (OFICIAL_VENTA by policy)', () => {
    const result = convertToArs(money('100', 'USD'), market());
    expect(result?.usdRate?.toString()).toBe('1580');
    expect(result?.usdRateType).toBe('OFICIAL_VENTA');
    expect(result?.grainArsPerTon).toBeNull();
  });

  it('records the rate type of an alternative policy', () => {
    expect(
      convertToArs(money('100', 'USD'), market(), 'BNA_PIZARRA')?.usdRateType,
    ).toBe('BNA_PIZARRA');
  });

  it('records nothing for ARS', () => {
    const result = convertToArs(money('5', 'ARS'), market());
    expect(result?.grainArsPerTon).toBeNull();
    expect(result?.usdRate).toBeNull();
    expect(result?.usdRateType).toBeNull();
  });
});
