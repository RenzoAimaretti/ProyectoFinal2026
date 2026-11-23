import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { PrismaService } from '../../prisma/prisma.service';
import { DailyReportModule } from '../daily-report/daily-report.module';
import { GetMarketSnapshotUseCase } from './application/use-cases/get-market-snapshot.use-case';
import { RetryPendingValuationsUseCase } from './application/use-cases/retry-pending-valuations.use-case';
import { ValuateDailyReportUseCase } from './application/use-cases/valuate-daily-report.use-case';
import { ValueMoneyUseCase } from './application/use-cases/value-money.use-case';
import { ValuationModule } from './valuation.module';

describe('ValuationModule', () => {
  it('exports every use case other modules consume and wires them without a database', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ValuationModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    const exported = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ValuationModule,
    ) as unknown[];
    expect(exported).toEqual(
      expect.arrayContaining([
        ValueMoneyUseCase,
        GetMarketSnapshotUseCase,
        ValuateDailyReportUseCase,
        RetryPendingValuationsUseCase,
      ]),
    );
    for (const useCase of exported) {
      expect(moduleRef.get(useCase as never, { strict: false })).toBeDefined();
    }
  });

  it('does not import DailyReportModule, so there is no module cycle', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      ValuationModule,
    ) as unknown[];

    expect(imports).not.toContain(DailyReportModule);
  });
});
