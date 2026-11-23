import { Logger } from '@nestjs/common';
import { RetryPendingValuationsUseCase } from '../../../valuation/application/use-cases/retry-pending-valuations.use-case';
import { ValuationPendingValuationRetryAdapter } from './valuation-pending-valuation-retry.adapter';

function build(execute: jest.Mock) {
  return new ValuationPendingValuationRetryAdapter({
    execute,
  } as unknown as RetryPendingValuationsUseCase);
}

describe('ValuationPendingValuationRetryAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('retries the whole company (no labor type)', async () => {
    const execute = jest.fn().mockResolvedValue({ failures: [] });

    await build(execute).retry('company-1');

    expect(execute).toHaveBeenCalledWith({ companyId: 'company-1' });
  });

  it('logs per-report failures and does not throw', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const execute = jest.fn().mockResolvedValue({
      failures: [{ reportId: 'r1', error: new Error('boom') }],
    });

    await expect(build(execute).retry('company-1')).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('r1'));
  });

  it('swallows an unexpected error so the calculator still opens', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const execute = jest.fn().mockRejectedValue(new Error('db down'));

    await expect(build(execute).retry('company-1')).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('db down'));
  });
});
