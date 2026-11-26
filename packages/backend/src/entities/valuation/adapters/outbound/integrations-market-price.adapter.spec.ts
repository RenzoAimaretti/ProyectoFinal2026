import {
  UpstreamError,
  UpstreamParseError,
  UpstreamUnavailableError,
} from '../../../../integrations/shared/domain/errors';
import { IntegrationsMarketPriceAdapter } from './integrations-market-price.adapter';

const GRAINS_OUTPUT = {
  source: 'cac.bcr.com.ar' as const,
  date: '2026-11-23',
  publishedAt: null,
  bnaRate: 1504,
  stale: false,
  fetchedAt: '2026-11-23T12:00:00.000Z',
  prices: [
    {
      grain: 'soja' as const,
      label: 'Soja',
      pricePerTonArs: 310000,
      pricePerTonUsd: 200,
    },
    {
      grain: 'trigo' as const,
      label: 'Trigo',
      pricePerTonArs: null,
      pricePerTonUsd: null,
    },
    {
      grain: 'maiz' as const,
      label: 'Maiz',
      pricePerTonArs: 150000.5,
      pricePerTonUsd: 100,
    },
  ],
};

const USD_OUTPUT = {
  source: 'dolarapi.com' as const,
  casa: 'oficial' as const,
  moneda: 'USD' as const,
  nombre: 'Oficial',
  compra: 1540,
  venta: 1580,
  fechaActualizacion: '2026-11-23T11:00:00.000Z',
  stale: true,
  fetchedAt: '2026-11-23T11:30:00.000Z',
};

function harness() {
  const grains = { execute: jest.fn().mockResolvedValue(GRAINS_OUTPUT) };
  const usd = { execute: jest.fn().mockResolvedValue(USD_OUTPUT) };
  const adapter = new IntegrationsMarketPriceAdapter(
    grains as never,
    usd as never,
  );
  return { adapter, grains, usd };
}

describe('IntegrationsMarketPriceAdapter', () => {
  it('queries only the grain board when only grains are needed', async () => {
    const { adapter, grains, usd } = harness();

    const snapshot = await adapter.getSnapshot({
      grains: ['SOJA'],
      usd: false,
    });

    expect(grains.execute).toHaveBeenCalledTimes(1);
    expect(usd.execute).not.toHaveBeenCalled();
    expect(snapshot.usd).toBeNull();
    expect(snapshot.grainArsPerTon.SOJA?.toString()).toBe('310000');
    expect(snapshot.sources).toEqual({ grains: 'cac.bcr.com.ar', usd: null });
    expect(snapshot.fetchedAt.grains).toEqual(
      new Date('2026-11-23T12:00:00.000Z'),
    );
    expect(snapshot.stale).toEqual({ grains: false, usd: false });
  });

  it('exposes only the requested grains and keeps "S/C" as null', async () => {
    const { adapter } = harness();

    const snapshot = await adapter.getSnapshot({
      grains: ['TRIGO', 'MAIZ'],
      usd: false,
    });

    expect(Object.keys(snapshot.grainArsPerTon).sort()).toEqual([
      'MAIZ',
      'TRIGO',
    ]);
    expect(snapshot.grainArsPerTon.TRIGO).toBeNull();
    expect(snapshot.grainArsPerTon.MAIZ?.toString()).toBe('150000.5');
  });

  it('treats a requested grain missing from the board as null', async () => {
    const { adapter } = harness();

    const snapshot = await adapter.getSnapshot({
      grains: ['GIRASOL'],
      usd: false,
    });

    expect(snapshot.grainArsPerTon.GIRASOL).toBeNull();
  });

  it('queries only the usd provider when only usd is needed and carries its stale flag', async () => {
    const { adapter, grains, usd } = harness();

    const snapshot = await adapter.getSnapshot({ grains: [], usd: true });

    expect(usd.execute).toHaveBeenCalledTimes(1);
    expect(grains.execute).not.toHaveBeenCalled();
    expect(snapshot.usd?.oficialVenta.toString()).toBe('1580');
    expect(snapshot.usd?.oficialCompra.toString()).toBe('1540');
    expect(snapshot.usd?.bnaPizarra).toBeNull();
    expect(snapshot.sources.usd).toBe('dolarapi.com');
    expect(snapshot.stale.usd).toBe(true);
    expect(snapshot.fetchedAt.usd).toEqual(
      new Date('2026-11-23T11:30:00.000Z'),
    );
  });

  it('queries nothing when nothing is needed', async () => {
    const { adapter, grains, usd } = harness();

    const snapshot = await adapter.getSnapshot({ grains: [], usd: false });

    expect(grains.execute).not.toHaveBeenCalled();
    expect(usd.execute).not.toHaveBeenCalled();
    expect(snapshot.usd).toBeNull();
    expect(snapshot.grainArsPerTon).toEqual({});
  });

  it('reads the BNA board rate only when the policy asks for BNA_PIZARRA', async () => {
    const { adapter, grains } = harness();

    const snapshot = await adapter.getSnapshot({
      grains: [],
      usd: true,
      usdRateType: 'BNA_PIZARRA',
    });

    expect(grains.execute).toHaveBeenCalledTimes(1);
    expect(snapshot.usd?.bnaPizarra?.toString()).toBe('1504');
  });

  it('turns an upstream error of the grain board into null prices, keeping usd', async () => {
    const { adapter, grains } = harness();
    for (const error of [
      new UpstreamError(503, 'https://cac.bcr.com.ar'),
      new UpstreamUnavailableError('down'),
      new UpstreamParseError('bad payload'),
    ]) {
      grains.execute.mockRejectedValueOnce(error);

      const snapshot = await adapter.getSnapshot({
        grains: ['SOJA'],
        usd: true,
      });

      expect(snapshot.grainArsPerTon).toEqual({ SOJA: null });
      expect(snapshot.sources.grains).toBeNull();
      expect(snapshot.usd?.oficialVenta.toString()).toBe('1580');
    }
  });

  it('turns an upstream error of the usd provider into a null usd, keeping grains', async () => {
    const { adapter, usd } = harness();
    usd.execute.mockRejectedValueOnce(new UpstreamUnavailableError('down'));

    const snapshot = await adapter.getSnapshot({ grains: ['SOJA'], usd: true });

    expect(snapshot.usd).toBeNull();
    expect(snapshot.sources.usd).toBeNull();
    expect(snapshot.grainArsPerTon.SOJA?.toString()).toBe('310000');
  });

  it('does not swallow errors that are not upstream failures', async () => {
    const { adapter, grains } = harness();
    grains.execute.mockRejectedValueOnce(new TypeError('bug'));

    await expect(
      adapter.getSnapshot({ grains: ['SOJA'], usd: false }),
    ).rejects.toThrow(TypeError);
  });
});
