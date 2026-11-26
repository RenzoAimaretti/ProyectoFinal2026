import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ValuationModule } from '../valuation/valuation.module';
import { ProfitabilityController } from './adapters/inbound/profitability.controller';
import { GetLotProfitabilityDetailUseCase } from './application/use-cases/get-lot-profitability-detail.use-case';
import { GetLotProfitabilityListUseCase } from './application/use-cases/get-lot-profitability-list.use-case';
import { ProfitabilityModule } from './profitability.module';

describe('composition root (profitability)', () => {
  it('wires ProfitabilityModule without a database', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ValuationModule, ProfitabilityModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(ProfitabilityController)).toBeInstanceOf(
      ProfitabilityController,
    );
    expect(
      moduleRef.get(GetLotProfitabilityListUseCase, { strict: false }),
    ).toBeInstanceOf(GetLotProfitabilityListUseCase);
    expect(
      moduleRef.get(GetLotProfitabilityDetailUseCase, { strict: false }),
    ).toBeInstanceOf(GetLotProfitabilityDetailUseCase);
  });
});
