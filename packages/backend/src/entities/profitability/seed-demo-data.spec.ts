import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The seed is a script that needs a database, so its demo finance data is
 * pinned from the source: the six expense categories and one tariff per seed
 * labor type, mixing ARS, USD and kilos of soy, with Traslado priced at 0.
 */
const source = readFileSync(
  join(__dirname, '../../../prisma/seed.ts'),
  'utf-8',
);

function tariffOf(laborVariable: string) {
  const match = new RegExp(
    String.raw`laborTypeId: ${laborVariable}\.id,\s*price: \[([^\]]*)\],\s*cost: \[([^\]]*)\]`,
  ).exec(source);
  if (!match) throw new Error(`no seed tariff for ${laborVariable}`);
  const parse = (raw: string) =>
    raw.split(',').map((part) => part.trim().replace(/^'|'$/g, ''));
  return { price: parse(match[1]), cost: parse(match[2]) };
}

describe('seed finance demo data', () => {
  it('loads the six expense categories of the seed tenant', () => {
    const block = /expenseCategory\.createMany\(\{[\s\S]*?\]\s*\.map/.exec(
      source,
    );
    expect(block).not.toBeNull();
    for (const name of [
      'Combustible',
      'Reparación',
      'Mantenimiento',
      'Flete',
      'Mano de obra',
      'Otros',
    ]) {
      expect(block?.[0]).toContain(`'${name}'`);
    }
    expect(source).toMatch(/tenantId: TENANT_ID,\s*name,/);
  });

  it.each([
    ['laborTypePulverizacion', ['12', 'KG_CEREAL', 'SOJA', 'POR_HECTAREA']],
    ['laborTypeFertilizacion', ['9', 'USD', 'null', 'POR_HECTAREA']],
    ['laborTypeSiembra', ['30', 'KG_CEREAL', 'SOJA', 'POR_HECTAREA']],
    ['laborTypeArranque', ['25000', 'ARS', 'null', 'POR_HORA']],
    ['laborTypeTraslado', ['0', 'ARS', 'null', 'POR_HORA']],
    ['laborTypePesaje', ['15000', 'ARS', 'null', 'POR_HORA']],
  ])('gives %s a tariff with a price and a cost', (labor, price) => {
    const tariff = tariffOf(labor);
    expect(tariff.price).toEqual(price);
    expect(tariff.cost).toHaveLength(4);
  });

  it('mixes ARS, USD and kilos of soy, and prices Traslado at 0', () => {
    const units = new Set(
      [
        'laborTypePulverizacion',
        'laborTypeFertilizacion',
        'laborTypeSiembra',
        'laborTypeArranque',
        'laborTypeTraslado',
        'laborTypePesaje',
      ].flatMap((labor) => {
        const tariff = tariffOf(labor);
        return [tariff.price[1], tariff.cost[1]];
      }),
    );
    expect([...units].sort()).toEqual(['ARS', 'KG_CEREAL', 'USD']);
    expect(tariffOf('laborTypeTraslado').price[0]).toBe('0');
  });

  it('creates the tariffs for the seed company', () => {
    expect(source).toMatch(
      /prisma\.tariff\.createMany\(\{[\s\S]*?companyId: COMPANY_ID/,
    );
  });
});
