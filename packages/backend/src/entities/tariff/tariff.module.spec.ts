import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MARKET_PRICE } from '../valuation/application/ports/market-price.port';
import { GetMarketSnapshotUseCase } from '../valuation/application/use-cases/get-market-snapshot.use-case';
import { ValueMoneyUseCase } from '../valuation/application/use-cases/value-money.use-case';
import { ValuationModule } from '../valuation/valuation.module';
import { TariffController } from './adapters/inbound/tariff.controller';
import { UpsertTariffUseCase } from './application/use-cases/upsert-tariff.use-case';
import { TariffModule } from './tariff.module';

describe('composition roots', () => {
  it('wires ValuationModule and TariffModule without a database', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ValuationModule, TariffModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(TariffController)).toBeInstanceOf(TariffController);
    expect(
      moduleRef.get(UpsertTariffUseCase, { strict: false }),
    ).toBeInstanceOf(UpsertTariffUseCase);
    expect(moduleRef.get(ValueMoneyUseCase, { strict: false })).toBeInstanceOf(
      ValueMoneyUseCase,
    );
    expect(
      moduleRef.get(GetMarketSnapshotUseCase, { strict: false }),
    ).toBeInstanceOf(GetMarketSnapshotUseCase);
    expect(moduleRef.get(MARKET_PRICE, { strict: false })).toBeDefined();
  });
});
