import { InvalidInputError } from './errors';
import { parseTariffValues } from './tariff.rules';

const valid = {
  price: {
    amount: '12',
    unit: 'KG_CEREAL',
    grain: 'SOJA',
    basis: 'POR_HECTAREA',
  },
  cost: { amount: '8000', unit: 'ARS', basis: 'POR_HORA' },
};

describe('parseTariffValues', () => {
  it('parses a price in kilos of soy per hectare and a cost in ARS per hour', () => {
    const values = parseTariffValues(valid);

    expect(values.price.money.amount.toString()).toBe('12');
    expect(values.price.money.unit).toBe('KG_CEREAL');
    expect(values.price.money.grain).toBe('SOJA');
    expect(values.price.basis).toBe('POR_HECTAREA');
    expect(values.cost.money.amount.toString()).toBe('8000');
    expect(values.cost.money.unit).toBe('ARS');
    expect(values.cost.money.grain).toBeNull();
    expect(values.cost.basis).toBe('POR_HORA');
  });

  it('accepts a price of 0 as a conscious decision', () => {
    const values = parseTariffValues({
      ...valid,
      price: { ...valid.price, amount: '0', unit: 'ARS', grain: undefined },
    });

    expect(values.price.money.amount.isZero()).toBe(true);
  });

  it('accepts a numeric amount and treats it as its decimal text', () => {
    const values = parseTariffValues({
      ...valid,
      cost: { ...valid.cost, amount: 8000.5 },
    });

    expect(values.cost.money.amount.toString()).toBe('8000.5');
  });

  it('requires the price', () => {
    expect(() => parseTariffValues({ cost: valid.cost })).toThrow(
      InvalidInputError,
    );
    expect(() => parseTariffValues({ price: null, cost: valid.cost })).toThrow(
      InvalidInputError,
    );
  });

  it('requires the standard cost', () => {
    expect(() => parseTariffValues({ price: valid.price })).toThrow(
      InvalidInputError,
    );
  });

  it('requires an amount for price and cost (missing, null or blank)', () => {
    for (const amount of [undefined, null, '', '  ']) {
      expect(() =>
        parseTariffValues({ ...valid, price: { ...valid.price, amount } }),
      ).toThrow(InvalidInputError);
      expect(() =>
        parseTariffValues({ ...valid, cost: { ...valid.cost, amount } }),
      ).toThrow(InvalidInputError);
    }
  });

  it('rejects amounts that are not a decimal number', () => {
    for (const amount of [
      'abc',
      '1,5',
      '1e3',
      Number.NaN,
      Number.POSITIVE_INFINITY,
      {},
      true,
    ]) {
      expect(() =>
        parseTariffValues({ ...valid, cost: { ...valid.cost, amount } }),
      ).toThrow(InvalidInputError);
    }
  });

  it('rejects negative amounts', () => {
    expect(() =>
      parseTariffValues({ ...valid, cost: { ...valid.cost, amount: '-1' } }),
    ).toThrow(InvalidInputError);
  });

  it('rejects amounts that do not fit Decimal(18,4)', () => {
    expect(() =>
      parseTariffValues({
        ...valid,
        cost: { ...valid.cost, amount: '1.00001' },
      }),
    ).toThrow(InvalidInputError);
    expect(() =>
      parseTariffValues({
        ...valid,
        cost: { ...valid.cost, amount: '100000000000000' },
      }),
    ).toThrow(InvalidInputError);
    expect(() =>
      parseTariffValues({
        ...valid,
        cost: { ...valid.cost, amount: '99999999999999.9999' },
      }),
    ).not.toThrow();
  });

  it('rejects kilos of cereal without grain', () => {
    expect(() =>
      parseTariffValues({
        ...valid,
        price: { ...valid.price, grain: undefined },
      }),
    ).toThrow(InvalidInputError);
    expect(() =>
      parseTariffValues({ ...valid, price: { ...valid.price, grain: null } }),
    ).toThrow(InvalidInputError);
  });

  it('rejects a grain together with ARS or USD', () => {
    expect(() =>
      parseTariffValues({ ...valid, cost: { ...valid.cost, grain: 'SOJA' } }),
    ).toThrow(InvalidInputError);
    expect(() =>
      parseTariffValues({
        ...valid,
        cost: { ...valid.cost, unit: 'USD', grain: 'MAIZ' },
      }),
    ).toThrow(InvalidInputError);
  });

  it('rejects an unknown unit, grain or basis', () => {
    expect(() =>
      parseTariffValues({ ...valid, cost: { ...valid.cost, unit: 'EUR' } }),
    ).toThrow(InvalidInputError);
    expect(() =>
      parseTariffValues({
        ...valid,
        price: { ...valid.price, grain: 'CEBADA' },
      }),
    ).toThrow(InvalidInputError);
    expect(() =>
      parseTariffValues({
        ...valid,
        cost: { ...valid.cost, basis: 'POR_VIAJE' },
      }),
    ).toThrow(InvalidInputError);
    expect(() =>
      parseTariffValues({
        ...valid,
        cost: { ...valid.cost, basis: undefined },
      }),
    ).toThrow(InvalidInputError);
  });

  it('keeps the independent basis and unit of price and cost', () => {
    const values = parseTariffValues({
      price: { amount: '100', unit: 'USD', basis: 'POR_HORA' },
      cost: {
        amount: '5',
        unit: 'KG_CEREAL',
        grain: 'TRIGO',
        basis: 'POR_HECTAREA',
      },
    });

    expect(values.price.basis).toBe('POR_HORA');
    expect(values.cost.basis).toBe('POR_HECTAREA');
    expect(values.cost.money.grain).toBe('TRIGO');
  });

  it("amount '-0' is accepted as zero", () => {
    const values = parseTariffValues({
      price: { amount: '-0', unit: 'ARS', basis: 'POR_HORA' },
      cost: { amount: '1', unit: 'ARS', basis: 'POR_HORA' },
    });

    expect(values.price.money.amount.isZero()).toBe(true);
    expect(values.price.money.amount.isNegative()).toBe(false);
    expect(values.price.money.amount.roundHalfUp(4).toString()).toBe('0.0000');
  });

  it('rejects an amount with exponent notation', () => {
    expect(() =>
      parseTariffValues({
        price: { amount: '1e3', unit: 'ARS', basis: 'POR_HORA' },
        cost: { amount: '1', unit: 'ARS', basis: 'POR_HORA' },
      }),
    ).toThrow(InvalidInputError);
  });
});
