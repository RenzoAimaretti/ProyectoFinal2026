import { Dec } from './decimal';
import { MarketSnapshot } from './market-snapshot';
import { usdRateFor, VALUATION_USD_RATE_TYPE } from './valuation-rate-policy';

const market = (usd: MarketSnapshot['usd']): MarketSnapshot => ({
  grainArsPerTon: {},
  usd,
  sources: { grains: null, usd: 'dolarapi.com' },
  fetchedAt: { grains: null, usd: null },
  stale: { grains: false, usd: false },
});

const usd = {
  oficialVenta: Dec.parse('1580'),
  oficialCompra: Dec.parse('1540'),
  bnaPizarra: Dec.parse('1504'),
};

describe('valuation rate policy', () => {
  it('uses OFICIAL_VENTA as the single default policy (decision D5)', () => {
    expect(VALUATION_USD_RATE_TYPE).toBe('OFICIAL_VENTA');
    expect(usdRateFor(market(usd))?.toString()).toBe('1580');
  });

  it('reads the field of the requested rate type', () => {
    expect(usdRateFor(market(usd), 'OFICIAL_COMPRA')?.toString()).toBe('1540');
    expect(usdRateFor(market(usd), 'BNA_PIZARRA')?.toString()).toBe('1504');
  });

  it('returns null when the market has no usd or the rate is missing', () => {
    expect(usdRateFor(market(null))).toBeNull();
    expect(
      usdRateFor(market({ ...usd, bnaPizarra: null }), 'BNA_PIZARRA'),
    ).toBeNull();
  });
});
