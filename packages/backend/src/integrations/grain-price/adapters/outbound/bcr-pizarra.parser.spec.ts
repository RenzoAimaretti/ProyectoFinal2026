import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { UpstreamParseError } from '../../../shared/domain/errors';
import { parsePizarra } from './bcr-pizarra.parser';

const pizarraFixture = readFileSync(
  join(__dirname, '__fixtures__', 'pizarra-bcr.html'),
  'utf8',
);

describe('parsePizarra', () => {
  it('extracts the five grains in pesos and dollars plus the BNA rate and the date', () => {
    const snapshot = parsePizarra(pizarraFixture);

    expect(snapshot.source).toBe('cac.bcr.com.ar');
    expect(snapshot.date).toBe('2026-10-14');
    expect(snapshot.bnaRate).toBe(1504);
    expect(snapshot.publishedAt).toBe('2026-10-15T10:16:00-03:00');

    expect(snapshot.prices).toEqual([
      {
        grain: 'trigo',
        label: 'Trigo',
        pricePerTonArs: 346000,
        pricePerTonUsd: 230.05,
      },
      {
        grain: 'maiz',
        label: 'Maíz',
        pricePerTonArs: 286000,
        pricePerTonUsd: 190.16,
      },
      {
        grain: 'girasol',
        label: 'Girasol',
        pricePerTonArs: 797120,
        pricePerTonUsd: 530,
      },
      {
        grain: 'soja',
        label: 'Soja',
        pricePerTonArs: 557000,
        pricePerTonUsd: 370.35,
      },
      {
        grain: 'sorgo',
        label: 'Sorgo',
        pricePerTonArs: 293230,
        pricePerTonUsd: 194.97,
      },
    ]);
  });

  it('throws UpstreamParseError instead of returning silent zeros when the board markup changes', () => {
    const mutatedPizarra = pizarraFixture.replaceAll(
      'class="board ',
      'class="card ',
    );

    expect(() => parsePizarra(mutatedPizarra)).toThrow(UpstreamParseError);
  });

  it('throws UpstreamParseError when none of the five grains is recognizable', () => {
    const renamedPizarra = pizarraFixture
      .replaceAll('Trigo', 'Wheat')
      .replaceAll('Maíz', 'Corn')
      .replaceAll('Girasol', 'Sunflower')
      .replaceAll('Soja', 'Soybean')
      .replaceAll('Sorgo', 'Sorghum');

    expect(() => parsePizarra(renamedPizarra)).toThrow(UpstreamParseError);
  });

  it('throws UpstreamParseError when the response is not a pizarra page', () => {
    expect(() =>
      parsePizarra('<html><body><p>Sitio en mantenimiento</p></body></html>'),
    ).toThrow(UpstreamParseError);
  });
});
