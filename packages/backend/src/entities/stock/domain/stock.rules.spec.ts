import {
  buildStockBalanceSummary,
  resolveStockBalance,
  resolveStockBalanceStatus,
} from './stock.rules';

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

  it('classifies netVsPlanned into FALTANTE, OK, and SOBRANTE', () => {
    expect(resolveStockBalanceStatus(-0.01)).toBe('FALTANTE');
    expect(resolveStockBalanceStatus(0)).toBe('OK');
    expect(resolveStockBalanceStatus(0.001)).toBe('OK');
    expect(resolveStockBalanceStatus(0.01)).toBe('SOBRANTE');
  });

  it('aggregates received, consumed, available, and planned quantities per input', () => {
    const summary = buildStockBalanceSummary({
      stocks: [
        { inputId: 'in-1', inputName: 'Glifosato', unit: 'L', quantity: 60 },
        { inputId: 'in-2', inputName: 'Atrazina', unit: 'kg', quantity: 20 },
      ],
      received: [
        { inputId: 'in-1', inputName: 'Glifosato', unit: 'L', quantity: 100 },
        { inputId: 'in-2', inputName: 'Atrazina', unit: 'kg', quantity: 20 },
      ],
      consumed: [
        { inputId: 'in-1', inputName: 'Glifosato', unit: 'L', quantity: 40 },
      ],
      planned: [
        { inputId: 'in-1', inputName: 'Glifosato', unit: 'L', quantity: 80 },
        { inputId: 'in-2', inputName: 'Atrazina', unit: 'kg', quantity: 20 },
        { inputId: 'in-3', inputName: 'Urea', unit: 'kg', quantity: 50 },
      ],
    });

    expect(summary).toEqual([
      {
        inputId: 'in-2',
        inputName: 'Atrazina',
        unit: 'kg',
        receivedQuantity: 20,
        consumedQuantity: 0,
        availableQuantity: 20,
        plannedQuantity: 20,
        netVsPlanned: 0,
        status: 'OK',
      },
      {
        inputId: 'in-1',
        inputName: 'Glifosato',
        unit: 'L',
        receivedQuantity: 100,
        consumedQuantity: 40,
        availableQuantity: 60,
        plannedQuantity: 80,
        netVsPlanned: -20,
        status: 'FALTANTE',
      },
      {
        inputId: 'in-3',
        inputName: 'Urea',
        unit: 'kg',
        receivedQuantity: 0,
        consumedQuantity: 0,
        availableQuantity: 0,
        plannedQuantity: 50,
        netVsPlanned: -50,
        status: 'FALTANTE',
      },
    ]);
  });
});
