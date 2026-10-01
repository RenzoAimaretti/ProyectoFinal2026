import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { FindStockBalanceUseCase } from '../../application/use-cases/find-stock-balance.use-case';
import { FindStockByClientUseCase } from '../../application/use-cases/find-stock-by-client.use-case';
import { InvalidInputError } from '../../domain/errors';
import { StockController } from './stock.controller';

const mockStock = {
  id: 'stock-1',
  clientId: 'client-1',
  inputId: 'input-1',
  quantity: 16.5,
  updatedAt: new Date('2026-04-02T09:30:00.000Z'),
  inputName: 'Glifosato',
  unit: 'L',
};

describe('StockController', () => {
  let controller: StockController;
  let findStockByClient: jest.Mocked<FindStockByClientUseCase>;
  let findStockBalance: jest.Mocked<FindStockBalanceUseCase>;

  beforeEach(() => {
    findStockByClient = { execute: jest.fn() } as unknown as jest.Mocked<FindStockByClientUseCase>;
    findStockBalance = { execute: jest.fn() } as unknown as jest.Mocked<FindStockBalanceUseCase>;

    controller = new StockController(findStockByClient, findStockBalance);
  });

  it('protects every route with JwtAuthGuard', () => {
    for (const method of ['findAll', 'findBalance'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        StockController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('lists the stock of the explicit client scope and exposes the input name', async () => {
    findStockByClient.execute.mockResolvedValue([mockStock]);

    await expect(controller.findAll('client-1')).resolves.toEqual([mockStock]);

    expect(findStockByClient.execute).toHaveBeenCalledWith('client-1');
  });

  it('rejects a missing clientId instead of inventing an identity', async () => {
    findStockByClient.execute.mockRejectedValue(
      new InvalidInputError('clientId is required'),
    );

    await expect(controller.findAll(undefined)).rejects.toThrow(
      BadRequestException,
    );
    expect(findStockByClient.execute).toHaveBeenCalledWith(undefined);
  });

  it('resolves a single balance from the client and input query', async () => {
    findStockBalance.execute.mockResolvedValue({
      clientId: 'client-1',
      inputId: 'input-1',
      quantity: 16.5,
    });

    await expect(
      controller.findBalance('client-1', 'input-1'),
    ).resolves.toEqual({
      clientId: 'client-1',
      inputId: 'input-1',
      quantity: 16.5,
    });

    expect(findStockBalance.execute).toHaveBeenCalledWith('client-1', 'input-1');
  });

  it('translates a missing balance scope to 400', async () => {
    findStockBalance.execute.mockRejectedValue(
      new InvalidInputError('inputId is required'),
    );

    await expect(controller.findBalance('client-1', '')).rejects.toThrow(
      BadRequestException,
    );
  });
});
