import { Logger } from '@nestjs/common';
import { ValuateDailyReportUseCase } from '../../../valuation/application/use-cases/valuate-daily-report.use-case';
import { ValuationDailyReportHookAdapter } from './valuation-daily-report-hook.adapter';

const approved = {
  companyId: 'company-1',
  reportId: 'report-1',
  approvedAt: new Date('2026-11-23T12:00:00Z'),
};

function firstArg(spy: jest.SpyInstance, call: number): string {
  return String((spy.mock.calls as unknown[][])[call][0]);
}

function build(execute: jest.Mock) {
  return new ValuationDailyReportHookAdapter({
    execute,
  } as unknown as ValuateDailyReportUseCase);
}

describe('ValuationDailyReportHookAdapter', () => {
  let errorLog: jest.SpyInstance;
  let warnLog: jest.SpyInstance;

  beforeEach(() => {
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnLog = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    errorLog.mockRestore();
    warnLog.mockRestore();
  });

  it('values the approved report of the company', async () => {
    const execute = jest
      .fn()
      .mockResolvedValue({ reportId: 'report-1', result: 'VALUADO' });

    await expect(build(execute).onApproved(approved)).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      reportId: 'report-1',
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it.each(['SIN_TARIFA', 'PRECIO_NO_DISPONIBLE'])(
    'logs a report left unvalued (%s) as a warning and does not fail',
    async (result) => {
      const execute = jest
        .fn()
        .mockResolvedValue({ reportId: 'report-1', result });

      await expect(
        build(execute).onApproved(approved),
      ).resolves.toBeUndefined();

      expect(warnLog).toHaveBeenCalledTimes(1);
      expect(firstArg(warnLog, 0)).toContain(result);
      expect(errorLog).not.toHaveBeenCalled();
    },
  );

  it('logs and swallows any error of the valuation', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('database down'));

    await expect(build(execute).onApproved(approved)).resolves.toBeUndefined();

    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(firstArg(errorLog, 0)).toContain('report-1');
    expect(firstArg(errorLog, 0)).toContain('database down');
  });

  it('swallows a non-Error rejection too', async () => {
    const execute = jest.fn().mockRejectedValue('plain string');

    await expect(build(execute).onApproved(approved)).resolves.toBeUndefined();

    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});
