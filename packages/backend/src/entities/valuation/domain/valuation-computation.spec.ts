import { Dec } from './decimal';
import { MarketUnavailableError } from './errors';
import { MarketSnapshot } from './market-snapshot';
import { Money } from './money';
import { USD_RATE_TYPE } from './valuation-rate-policy';
import {
  ValuationTariff,
  computeValuation,
  marketNeedOf,
  quantityFromNumber,
  revalueToday,
} from './valuation.rules';

const FETCHED = new Date('2026-11-23T12:00:00Z');

const market = (overrides: Partial<MarketSnapshot> = {}): MarketSnapshot => ({
  grainArsPerTon: { SOJA: Dec.parse('310000'), TRIGO: null },
  usd: {
    oficialVenta: Dec.parse('1530'),
    oficialCompra: Dec.parse('1500'),
    bnaPizarra: null,
  },
  sources: { grains: 'cac.bcr.com.ar', usd: 'dolarapi.com' },
  fetchedAt: { grains: FETCHED, usd: FETCHED },
  stale: { grains: false, usd: false },
  ...overrides,
});

const money = (
  amount: string,
  unit: Money['unit'],
  grain: Money['grain'] = null,
): Money => ({ amount: Dec.parse(amount), unit, grain });

const tariff = (
  price: Money,
  cost: Money,
  priceBasis: 'POR_HECTAREA' | 'POR_HORA' = 'POR_HECTAREA',
  costBasis: 'POR_HECTAREA' | 'POR_HORA' = 'POR_HORA',
): ValuationTariff => ({
  id: 'tariff-1',
  price: { money: price, basis: priceBasis },
  cost: { money: cost, basis: costBasis },
});

const report = (hectares: string, hours: string) => ({
  hectares: Dec.parse(hectares),
  hours: Dec.parse(hours),
});

describe('quantityFromNumber', () => {
  it('converts the Float columns through their decimal string, never through float math', () => {
    expect(quantityFromNumber(12.5).toString()).toBe('12.5000');
    expect(quantityFromNumber(0.1).toString()).toBe('0.1000');
    expect(quantityFromNumber(0.1 + 0.2).toString()).toBe('0.3000');
    expect(quantityFromNumber(1e-7).toString()).toBe('0.0000');
    expect(quantityFromNumber(0).toString()).toBe('0.0000');
  });

  it('rejects values that are not finite numbers', () => {
    expect(() => quantityFromNumber(Number.NaN)).toThrow();
    expect(() => quantityFromNumber(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('computeValuation', () => {
  it('values a per-hectare price in kilos and a per-hour cost in ARS and keeps native amounts', () => {
    const result = computeValuation(
      report('12.5', '6'),
      tariff(money('48', 'KG_CEREAL', 'SOJA'), money('8000', 'ARS')),
      market(),
    );

    expect(result).not.toBeNull();
    expect(result?.incomeNative.toString()).toBe('600.0000'); // 48 kg/ha x 12.5 ha
    expect(result?.costNative.toString()).toBe('48000.0000'); // 8000 ARS/h x 6 h
    expect(result?.incomeArs.toString()).toBe('186000.00'); // 600 kg x 310000 / 1000
    expect(result?.costArs.toString()).toBe('48000.00');
    expect(result?.hectares.toString()).toBe('12.5');
    expect(result?.hours.toString()).toBe('6');
    expect(result?.incomeGrainArsPerTon?.toString()).toBe('310000');
    expect(result?.costGrainArsPerTon).toBeNull();
    expect(result?.usdRate).toBeNull();
    expect(result?.usdRateType).toBeNull();
    expect(result?.grainSource).toBe('cac.bcr.com.ar');
    expect(result?.usdSource).toBeNull();
    expect(result?.priceFetchedAt).toEqual(FETCHED);
    expect(result?.priceStale).toBe(false);
  });

  it('values USD with the policy rate and records its type and source', () => {
    const result = computeValuation(
      report('10', '2'),
      tariff(money('100', 'USD'), money('1000', 'ARS')),
      market(),
    );

    expect(result?.incomeNative.toString()).toBe('1000.0000');
    expect(result?.incomeArs.toString()).toBe('1530000.00');
    expect(result?.usdRate?.toString()).toBe('1530');
    expect(result?.usdRateType).toBe(USD_RATE_TYPE.OFICIAL_VENTA);
    expect(result?.usdSource).toBe('dolarapi.com');
  });

  it('honours an explicit rate type policy', () => {
    const result = computeValuation(
      report('10', '2'),
      tariff(money('100', 'USD'), money('0', 'ARS')),
      market(),
      USD_RATE_TYPE.OFICIAL_COMPRA,
    );

    expect(result?.incomeArs.toString()).toBe('1500000.00');
    expect(result?.usdRateType).toBe(USD_RATE_TYPE.OFICIAL_COMPRA);
  });

  it('uses hours for a per-hour price and hectares for a per-hectare cost', () => {
    const result = computeValuation(
      report('12.5', '6'),
      tariff(
        money('100', 'ARS'),
        money('10', 'ARS'),
        'POR_HORA',
        'POR_HECTAREA',
      ),
      market(),
    );

    expect(result?.incomeNative.toString()).toBe('600.0000');
    expect(result?.costNative.toString()).toBe('125.0000');
  });

  it('produces cost without income when the report has hours but 0 hectares', () => {
    const result = computeValuation(
      report('0', '4'),
      tariff(money('48', 'KG_CEREAL', 'SOJA'), money('8000', 'ARS')),
      market(),
    );

    expect(result?.incomeNative.toString()).toBe('0.0000');
    expect(result?.incomeArs.toString()).toBe('0.00');
    expect(result?.costArs.toString()).toBe('32000.00');
  });

  it('accepts a tariff with a 0 amount', () => {
    const result = computeValuation(
      report('10', '4'),
      tariff(money('0', 'ARS'), money('0', 'ARS')),
      market(),
    );

    expect(result?.incomeArs.toString()).toBe('0.00');
    expect(result?.costArs.toString()).toBe('0.00');
  });

  it('is all or nothing: a missing grain price leaves the report unvalued', () => {
    const result = computeValuation(
      report('10', '4'),
      tariff(money('48', 'ARS'), money('10', 'KG_CEREAL', 'TRIGO')),
      market(),
    );

    expect(result).toBeNull();
  });

  it('is all or nothing: a missing USD quote leaves the report unvalued', () => {
    const result = computeValuation(
      report('10', '4'),
      tariff(money('48', 'USD'), money('10', 'ARS')),
      market({ usd: null }),
    );

    expect(result).toBeNull();
  });

  it('does not need the market for an ARS-only tariff', () => {
    const empty = market({
      grainArsPerTon: {},
      usd: null,
      sources: { grains: null, usd: null },
      fetchedAt: { grains: null, usd: null },
    });

    const result = computeValuation(
      report('10', '4'),
      tariff(money('5', 'ARS'), money('2', 'ARS')),
      empty,
    );

    expect(result?.incomeArs.toString()).toBe('50.00');
    expect(result?.priceFetchedAt).toBeNull();
    expect(result?.grainSource).toBeNull();
    expect(result?.usdSource).toBeNull();
  });

  it('flags a stale price only when a stale component was actually used', () => {
    const stale = market({ stale: { grains: true, usd: false } });

    const used = computeValuation(
      report('10', '1'),
      tariff(money('1', 'KG_CEREAL', 'SOJA'), money('1', 'ARS')),
      stale,
    );
    const unused = computeValuation(
      report('10', '1'),
      tariff(money('1', 'USD'), money('1', 'ARS')),
      stale,
    );

    expect(used?.priceStale).toBe(true);
    expect(unused?.priceStale).toBe(false);
  });

  it('keeps the oldest fetch time of the components it used', () => {
    const older = new Date('2026-11-23T08:00:00Z');
    const result = computeValuation(
      report('10', '1'),
      tariff(money('1', 'KG_CEREAL', 'SOJA'), money('1', 'USD')),
      market({ fetchedAt: { grains: older, usd: FETCHED } }),
    );

    expect(result?.priceFetchedAt).toEqual(older);
  });
});

describe('marketNeedOf', () => {
  it('asks only for the grains and the dollar the tariff uses', () => {
    expect(
      marketNeedOf(
        tariff(
          money('1', 'KG_CEREAL', 'SOJA'),
          money('1', 'KG_CEREAL', 'SOJA'),
        ),
      ),
    ).toEqual({ grains: ['SOJA'], usd: false });
    expect(
      marketNeedOf(tariff(money('1', 'KG_CEREAL', 'MAIZ'), money('1', 'USD'))),
    ).toEqual({ grains: ['MAIZ'], usd: true });
    expect(marketNeedOf(tariff(money('1', 'ARS'), money('1', 'ARS')))).toEqual({
      grains: [],
      usd: false,
    });
  });
});

describe('revalueToday', () => {
  it('re-prices agreed kilos with today price and leaves the original untouched', () => {
    const native = money('600', 'KG_CEREAL', 'SOJA');
    const today = market({
      grainArsPerTon: { SOJA: Dec.parse('330000') },
    });

    expect(revalueToday(native, today).toString()).toBe('198000.00');
    expect(native.amount.toString()).toBe('600');
  });

  it('does not adjust an ARS amount', () => {
    expect(revalueToday(money('48000', 'ARS'), market()).toString()).toBe(
      '48000.00',
    );
  });

  it('re-prices USD with the policy rate of today, not the one of the snapshot', () => {
    const atApproval = computeValuation(
      report('10', '1'),
      tariff(money('100', 'USD'), money('0', 'ARS')),
      market(),
      USD_RATE_TYPE.OFICIAL_VENTA,
    );
    const native: Money = {
      amount: atApproval!.incomeNative,
      unit: 'USD',
      grain: null,
    };

    expect(atApproval?.incomeArs.toString()).toBe('1530000.00');
    expect(atApproval?.usdRateType).toBe(USD_RATE_TYPE.OFICIAL_VENTA);
    expect(
      revalueToday(native, market(), USD_RATE_TYPE.OFICIAL_COMPRA).toString(),
    ).toBe('1500000.00');
    expect(atApproval?.incomeArs.toString()).toBe('1530000.00');
  });

  it('throws MarketUnavailableError when today price is missing, never 0', () => {
    expect(() =>
      revalueToday(money('600', 'KG_CEREAL', 'TRIGO'), market()),
    ).toThrow(MarketUnavailableError);
    expect(() =>
      revalueToday(money('10', 'USD'), market({ usd: null })),
    ).toThrow(MarketUnavailableError);
  });
});
