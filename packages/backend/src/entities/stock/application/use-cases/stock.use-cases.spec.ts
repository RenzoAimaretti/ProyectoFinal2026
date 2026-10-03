import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InvalidInputError } from '../../domain/errors';
import { StockRepositoryPort } from '../stock.ports';
import { StockRecord } from '../stock.types';
import { FindStockBalanceUseCase } from './find-stock-balance.use-case';
import { FindStockByClientUseCase } from './find-stock-by-client.use-case';

const baseStock: StockRecord = {
  id: 'stock-1',
  clientId: 'client-1',
  inputId: 'input-1',
  quantity: 16.5,
  updatedAt: new Date('2026-04-02T09:30:00.000Z'),
};

function createRepository(): jest.Mocked<StockRepositoryPort> {
  return {
    findAllByClient: jest.fn(),
    findByClientAndInput: jest.fn(),
  };
}

describe('Stock use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/stock');
    const files = [
      'domain/errors.ts',
      'domain/stock.rules.ts',
      'application/stock.ports.ts',
      'application/stock.types.ts',
      'application/stock.validation.ts',
      'application/use-cases/find-stock-by-client.use-case.ts',
      'application/use-cases/find-stock-balance.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindStockByClientUseCase', () => {
    it('lists the balances of the client scope', async () => {
      const repository = createRepository();
      const useCase = new FindStockByClientUseCase(repository);
      repository.findAllByClient.mockResolvedValue([baseStock]);

      await expect(useCase.execute('client-1')).resolves.toEqual([baseStock]);

      expect(repository.findAllByClient).toHaveBeenCalledWith('client-1');
    });

    it('returns an empty list when the client has no balance', async () => {
      const repository = createRepository();
      const useCase = new FindStockByClientUseCase(repository);
      repository.findAllByClient.mockResolvedValue([]);

      await expect(useCase.execute('client-2')).resolves.toEqual([]);
    });

    it.each([['  '], [undefined as unknown as string]])(
      'rejects a blank client id (%s) before touching the repository',
      async (clientId) => {
        const repository = createRepository();
        const useCase = new FindStockByClientUseCase(repository);

        await expect(useCase.execute(clientId)).rejects.toBeInstanceOf(
          InvalidInputError,
        );

        expect(repository.findAllByClient).not.toHaveBeenCalled();
      },
    );
  });

  describe('FindStockBalanceUseCase', () => {
    it('resolves the balance of one client input pair', async () => {
      const repository = createRepository();
      const useCase = new FindStockBalanceUseCase(repository);
      repository.findByClientAndInput.mockResolvedValue(baseStock);

      await expect(
        useCase.execute('client-1', 'input-1'),
      ).resolves.toEqual({
        clientId: 'client-1',
        inputId: 'input-1',
        quantity: 16.5,
      });

      expect(repository.findByClientAndInput).toHaveBeenCalledWith(
        'client-1',
        'input-1',
      );
    });

    it('reports a zero balance when the pair has no stored row', async () => {
      const repository = createRepository();
      const useCase = new FindStockBalanceUseCase(repository);
      repository.findByClientAndInput.mockResolvedValue(null);

      await expect(
        useCase.execute('client-1', 'input-9'),
      ).resolves.toEqual({
        clientId: 'client-1',
        inputId: 'input-9',
        quantity: 0,
      });
    });

    it.each([
      ['an empty client id', '  ', 'input-1'],
      ['an empty input id', 'client-1', '  '],
    ])(
      'rejects %s before touching the repository',
      async (_label, clientId, inputId) => {
        const repository = createRepository();
        const useCase = new FindStockBalanceUseCase(repository);

        await expect(
          useCase.execute(clientId, inputId),
        ).rejects.toBeInstanceOf(InvalidInputError);

        expect(repository.findByClientAndInput).not.toHaveBeenCalled();
      },
    );
  });
});
