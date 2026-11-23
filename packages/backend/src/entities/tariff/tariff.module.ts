import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { ValueMoneyUseCase } from '../valuation/application/use-cases/value-money.use-case';
import { ValuationModule } from '../valuation/valuation.module';
import { TariffController } from './adapters/inbound/tariff.controller';
import { PrismaLaborTypeReader } from './adapters/outbound/prisma-labor-type.reader';
import { PrismaTariffRepository } from './adapters/outbound/prisma-tariff.repository';
import { SystemClock } from './adapters/outbound/system-clock';
import { ValuationMoneyValuationAdapter } from './adapters/outbound/valuation-money-valuation.adapter';
import { CLOCK, ClockPort } from './application/ports/clock.port';
import {
  LABOR_TYPE_READER,
  LaborTypeReaderPort,
} from './application/ports/labor-type-reader.port';
import {
  MONEY_VALUATION,
  MoneyValuationPort,
} from './application/ports/money-valuation.port';
import {
  TARIFF_REPOSITORY,
  TariffRepositoryPort,
} from './application/ports/tariff-repository.port';
import { DeleteTariffUseCase } from './application/use-cases/delete-tariff.use-case';
import { FindTariffsUseCase } from './application/use-cases/find-tariffs.use-case';
import { GetTariffKgEquivalentsUseCase } from './application/use-cases/get-tariff-kg-equivalents.use-case';
import { UpsertTariffUseCase } from './application/use-cases/upsert-tariff.use-case';

@Module({
  imports: [PrismaModule, ValuationModule],
  controllers: [TariffController],
  providers: [
    {
      provide: TARIFF_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaTariffRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: LABOR_TYPE_READER,
      useFactory: (prisma: PrismaService) => new PrismaLaborTypeReader(prisma),
      inject: [PrismaService],
    },
    {
      provide: MONEY_VALUATION,
      useFactory: (valueMoney: ValueMoneyUseCase) =>
        new ValuationMoneyValuationAdapter(valueMoney),
      inject: [ValueMoneyUseCase],
    },
    { provide: CLOCK, useFactory: () => new SystemClock() },
    {
      provide: FindTariffsUseCase,
      useFactory: (tariffs: TariffRepositoryPort) =>
        new FindTariffsUseCase(tariffs),
      inject: [TARIFF_REPOSITORY],
    },
    {
      provide: UpsertTariffUseCase,
      useFactory: (
        tariffs: TariffRepositoryPort,
        laborTypes: LaborTypeReaderPort,
      ) => new UpsertTariffUseCase(tariffs, laborTypes),
      inject: [TARIFF_REPOSITORY, LABOR_TYPE_READER],
    },
    {
      provide: DeleteTariffUseCase,
      useFactory: (tariffs: TariffRepositoryPort) =>
        new DeleteTariffUseCase(tariffs),
      inject: [TARIFF_REPOSITORY],
    },
    {
      provide: GetTariffKgEquivalentsUseCase,
      useFactory: (
        tariffs: TariffRepositoryPort,
        valuation: MoneyValuationPort,
        clock: ClockPort,
      ) => new GetTariffKgEquivalentsUseCase(tariffs, valuation, clock),
      inject: [TARIFF_REPOSITORY, MONEY_VALUATION, CLOCK],
    },
  ],
})
export class TariffModule {}
