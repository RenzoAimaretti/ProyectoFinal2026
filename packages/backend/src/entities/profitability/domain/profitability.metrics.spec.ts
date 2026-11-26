import { Dec } from '../../valuation/domain/decimal';
import {
  margin,
  marginPerHa,
  metricsOf,
  profitability,
  totalsOf,
} from './profitability.metrics';

const d = (value: string) => Dec.parse(value);

describe('profitability metrics', () => {
  it('computes the spec example: income 600000, standard cost 150000, expenses 50000 on 100 ha', () => {
    const result = metricsOf({
      income: d('600000'),
      cost: d('150000').add(d('50000')),
      areaHa: d('100'),
    });

    expect(result.margin.toString()).toBe('400000.00');
    expect(result.marginPerHa?.toString()).toBe('4000.00');
    expect(result.profitability?.toString()).toBe('2.0000');
  });

  it('margin is income minus cost', () => {
    expect(margin(d('10'), d('4')).toString()).toBe('6.00');
  });

  it('presents profitability as null when the cost is 0, while the margin is computed normally', () => {
    const result = metricsOf({
      income: d('1000'),
      cost: d('0'),
      areaHa: d('10'),
    });

    expect(result.margin.toString()).toBe('1000.00');
    expect(result.profitability).toBeNull();
    expect(profitability(d('1000'), d('0.00'))).toBeNull();
  });

  it('gives a negative margin when there is cost without income', () => {
    const result = metricsOf({
      income: d('0'),
      cost: d('8000'),
      areaHa: d('20'),
    });

    expect(result.margin.toString()).toBe('-8000.00');
    expect(result.marginPerHa?.toString()).toBe('-400.00');
    expect(result.profitability?.toString()).toBe('-1.0000');
  });

  it('has no margin per hectare when the lot area is 0 or negative', () => {
    expect(marginPerHa(d('100'), d('0'))).toBeNull();
    expect(marginPerHa(d('100'), d('-1'))).toBeNull();
  });

  it('rounds half up: margin per ha to 2 decimals and profitability to 4', () => {
    expect(marginPerHa(d('100'), d('3'))?.toString()).toBe('33.33');
    expect(profitability(d('100'), d('3'))?.toString()).toBe('33.3333');
    expect(marginPerHa(d('1'), d('8'))?.toString()).toBe('0.13');
  });

  describe('totalsOf', () => {
    it('adds incomes, costs and areas and computes the metrics over the sums, not by averaging rows', () => {
      const totals = totalsOf([
        { income: d('600000'), cost: d('200000'), areaHa: d('100') },
        { income: d('0'), cost: d('100000'), areaHa: d('300') },
      ]);

      expect(totals.income.toString()).toBe('600000.00');
      expect(totals.cost.toString()).toBe('300000.00');
      expect(totals.areaHa.toString()).toBe('400.0000');
      expect(totals.margin.toString()).toBe('300000.00');
      // 300000 / 400 ha, not the average of 4000 and -333.33.
      expect(totals.marginPerHa?.toString()).toBe('750.00');
      // 300000 / 300000, not the average of 2 and -1.
      expect(totals.profitability?.toString()).toBe('1.0000');
    });

    it('is all zeros with null ratios when there are no rows', () => {
      const totals = totalsOf([]);

      expect(totals.income.toString()).toBe('0.00');
      expect(totals.cost.toString()).toBe('0.00');
      expect(totals.margin.toString()).toBe('0.00');
      expect(totals.marginPerHa).toBeNull();
      expect(totals.profitability).toBeNull();
    });
  });
});
