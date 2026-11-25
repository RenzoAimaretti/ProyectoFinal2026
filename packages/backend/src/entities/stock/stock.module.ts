import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientModule } from '../client/client.module';
import {
  STOCK_BALANCE_SUMMARY_READER,
  STOCK_REPOSITORY,
  StockBalanceSummaryReaderPort,
  StockRepositoryPort,
} from './application/stock.ports';
import { FindStockBalanceUseCase } from './application/use-cases/find-stock-balance.use-case';
import { FindStockBalanceSummaryUseCase } from './application/use-cases/find-stock-balance-summary.use-case';
import { FindStockByClientUseCase } from './application/use-cases/find-stock-by-client.use-case';
import { StockController } from './adapters/inbound/stock.controller';
import { PrismaStockRepository } from './adapters/outbound/prisma-stock.repository';
import { PrismaStockBalanceSummaryReader } from './adapters/outbound/prisma-stock-balance-summary.reader';

@Module({
  imports: [PrismaModule, ClientModule],
  controllers: [StockController],
  providers: [
    PrismaStockRepository,
    { provide: STOCK_REPOSITORY, useExisting: PrismaStockRepository },
    PrismaStockBalanceSummaryReader,
    {
      provide: STOCK_BALANCE_SUMMARY_READER,
      useExisting: PrismaStockBalanceSummaryReader,
    },
    {
      provide: FindStockByClientUseCase,
      useFactory: (repository: StockRepositoryPort) =>
        new FindStockByClientUseCase(repository),
      inject: [STOCK_REPOSITORY],
    },
    {
      provide: FindStockBalanceUseCase,
      useFactory: (repository: StockRepositoryPort) =>
        new FindStockBalanceUseCase(repository),
      inject: [STOCK_REPOSITORY],
    },
    {
      provide: FindStockBalanceSummaryUseCase,
      useFactory: (reader: StockBalanceSummaryReaderPort) =>
        new FindStockBalanceSummaryUseCase(reader),
      inject: [STOCK_BALANCE_SUMMARY_READER],
    },
  ],
  exports: [
    FindStockByClientUseCase,
    FindStockBalanceUseCase,
    FindStockBalanceSummaryUseCase,
  ],
})
export class StockModule {}
