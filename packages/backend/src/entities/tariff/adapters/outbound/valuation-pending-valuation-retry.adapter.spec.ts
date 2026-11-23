import { Logger } from '@nestjs/common';
import { RetryPendingValuationsUseCase } from '../../../valuation/application/use-cases/retry-pending-valuations.use-case';
import { ValuationPendingValuationRetryAdapter } from './valuation-pending-valuation-retry.adapter';

const summary = {
  processed: 0,
  valued: 0,
  withoutTariff: 0,
  priceUnavailable: 0,
  alreadyValued: 0,
  failures: [],
};

function firstArg(spy: jest.SpyInstance, call: number): string {
  return String((spy.mock.calls as unknown[][])[call][0]);
}

function build(execute: jest.Mock) {
  return new ValuationPendingValuationRetryAdapter({
    execute,
  } as unknown as RetryPendingValuationsUseCase);
}

describe('ValuationPendingValuationRetryAdapter', () => {
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => errorLog.mockRestore());

  it('retries the pending valuations of the company and labor type', async () => {
    const execute = jest.fn().mockResolvedValue({ ...summary, valued: 3 });

    await build(execute).retry({
      companyId: 'company-1',
      laborTypeId: 'labor-1',
    });

    expect(execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      laborTypeId: 'labor-1',
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('logs and swallows an error thrown by the retry', async () => {
    const boom = new Error('database down');
    const execute = jest.fn().mockRejectedValue(boom);

    await expect(
      build(execute).retry({ companyId: 'company-1', laborTypeId: 'labor-1' }),
    ).resolves.toBeUndefined();

    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(firstArg(errorLog, 0)).toContain('database down');
  });

  it('logs every per-report failure the retry reports without throwing', async () => {
    const execute = jest.fn().mockResolvedValue({
      ...summary,
      processed: 2,
      failures: [
        { reportId: 'report-1', error: new Error('constraint') },
        { reportId: 'report-2', error: 'plain failure' },
      ],
    });

    await expect(
      build(execute).retry({ companyId: 'company-1', laborTypeId: 'labor-1' }),
    ).resolves.toBeUndefined();

    expect(errorLog).toHaveBeenCalledTimes(2);
    expect(firstArg(errorLog, 0)).toContain('report-1');
    expect(firstArg(errorLog, 1)).toContain('report-2');
  });
});
