import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  STOCK_REPOSITORY,
  StockRepositoryPort,
} from './application/stock.ports';
import { FindStockBalanceUseCase } from './application/use-cases/find-stock-balance.use-case';
import { FindStockByClientUseCase } from './application/use-cases/find-stock-by-client.use-case';
import { PrismaStockRepository } from './adapters/outbound/prisma-stock.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaStockRepository,
    { provide: STOCK_REPOSITORY, useExisting: PrismaStockRepository },
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
  ],
  exports: [FindStockByClientUseCase, FindStockBalanceUseCase],
})
export class StockModule {}
