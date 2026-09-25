import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { STOCK_REPOSITORY } from './application/stock.ports';
import { FindStockBalanceUseCase } from './application/use-cases/find-stock-balance.use-case';
import { FindStockByClientUseCase } from './application/use-cases/find-stock-by-client.use-case';
import { StockModule } from './stock.module';

describe('StockModule', () => {
  it('wires every stock use case through its port', async () => {
    const repository = {
      findAllByClient: jest.fn().mockResolvedValue([]),
      findByClientAndInput: jest.fn().mockResolvedValue(null),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [StockModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(STOCK_REPOSITORY)
      .useValue(repository)
      .compile();

    expect(moduleRef.get(FindStockByClientUseCase)).toBeInstanceOf(
      FindStockByClientUseCase,
    );
    expect(moduleRef.get(FindStockBalanceUseCase)).toBeInstanceOf(
      FindStockBalanceUseCase,
    );

    await expect(
      moduleRef.get(FindStockByClientUseCase).execute('client-1'),
    ).resolves.toEqual([]);
    expect(repository.findAllByClient).toHaveBeenCalledWith('client-1');

    await expect(
      moduleRef.get(FindStockBalanceUseCase).execute('client-1', 'input-1'),
    ).resolves.toEqual({
      clientId: 'client-1',
      inputId: 'input-1',
      quantity: 0,
    });
  });
});
