import { ValueMoneyUseCase } from '../../../valuation/application/use-cases/value-money.use-case';
import {
  InvalidMoneyError,
  MarketUnavailableError,
} from '../../../valuation/domain/errors';
import { ValuationMoneyValuationAdapter } from './valuation-money-valuation.adapter';

const valued = {
  amountArs: '186000.00',
  grainArsPerTon: '310000',
  usdRate: null,
  usdRateType: null,
  grainSource: 'cac.bcr.com.ar',
  usdSource: null,
  priceFetchedAt: new Date('2026-11-23T12:00:00Z'),
  priceStale: false,
};

function build(execute: jest.Mock) {
  return new ValuationMoneyValuationAdapter({
    execute,
  } as unknown as ValueMoneyUseCase);
}

describe('ValuationMoneyValuationAdapter', () => {
  it('delegates to ValueMoneyUseCase and exposes the ARS amount and the grain price', async () => {
    const execute = jest.fn().mockResolvedValue(valued);

    const result = await build(execute).valueToArs({
      amount: '600',
      unit: 'KG_CEREAL',
      grain: 'SOJA',
    });

    expect(execute).toHaveBeenCalledWith({
      amount: '600',
      unit: 'KG_CEREAL',
      grain: 'SOJA',
    });
    expect(result).toEqual({
      amountArs: '186000.00',
      grainArsPerTon: '310000',
    });
  });

  it('answers null when the market data is unavailable', async () => {
    const execute = jest.fn().mockRejectedValue(new MarketUnavailableError());

    await expect(
      build(execute).valueToArs({ amount: '1', unit: 'USD', grain: null }),
    ).resolves.toBeNull();
  });

  it('does not hide other errors', async () => {
    const execute = jest.fn().mockRejectedValue(new InvalidMoneyError('bad'));

    await expect(
      build(execute).valueToArs({ amount: '1', unit: 'USD', grain: null }),
    ).rejects.toBeInstanceOf(InvalidMoneyError);
  });
});
