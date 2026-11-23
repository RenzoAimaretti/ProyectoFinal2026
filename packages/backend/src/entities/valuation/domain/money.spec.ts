import { Dec } from './decimal';
import { InvalidMoneyError } from './errors';
import { assertValidMoney, Money } from './money';

const money = (
  amount: string,
  unit: Money['unit'],
  grain: Money['grain'],
): Money => ({
  amount: Dec.parse(amount),
  unit,
  grain,
});

describe('assertValidMoney', () => {
  it('accepts ARS and USD without grain', () => {
    expect(() => assertValidMoney(money('10', 'ARS', null))).not.toThrow();
    expect(() => assertValidMoney(money('10', 'USD', null))).not.toThrow();
  });

  it('accepts kilos of cereal with a grain', () => {
    expect(() =>
      assertValidMoney(money('12', 'KG_CEREAL', 'SOJA')),
    ).not.toThrow();
  });

  it('accepts zero as a valid amount', () => {
    expect(() => assertValidMoney(money('0', 'ARS', null))).not.toThrow();
    expect(() =>
      assertValidMoney(money('0', 'KG_CEREAL', 'MAIZ')),
    ).not.toThrow();
  });

  it('rejects kilos of cereal without grain', () => {
    expect(() => assertValidMoney(money('12', 'KG_CEREAL', null))).toThrow(
      InvalidMoneyError,
    );
  });

  it('rejects a grain on ARS or USD', () => {
    expect(() => assertValidMoney(money('12', 'ARS', 'SOJA'))).toThrow(
      InvalidMoneyError,
    );
    expect(() => assertValidMoney(money('12', 'USD', 'TRIGO'))).toThrow(
      InvalidMoneyError,
    );
  });

  it('rejects negative amounts', () => {
    expect(() => assertValidMoney(money('-1', 'ARS', null))).toThrow(
      InvalidMoneyError,
    );
  });
});
