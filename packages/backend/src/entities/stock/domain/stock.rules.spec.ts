import { resolveStockBalance } from './stock.rules';

describe('Stock domain rules', () => {
  it('keeps the stored quantity of the client input balance', () => {
    expect(resolveStockBalance('client-1', 'input-1', 12.5)).toEqual({
      clientId: 'client-1',
      inputId: 'input-1',
      quantity: 12.5,
    });
  });

  it('reports a zero balance when the client never received the input', () => {
    expect(resolveStockBalance('client-1', 'input-1', null)).toEqual({
      clientId: 'client-1',
      inputId: 'input-1',
      quantity: 0,
    });
  });

  it('keeps a zero quantity as a real balance', () => {
    expect(resolveStockBalance('client-1', 'input-1', 0).quantity).toBe(0);
  });
});
