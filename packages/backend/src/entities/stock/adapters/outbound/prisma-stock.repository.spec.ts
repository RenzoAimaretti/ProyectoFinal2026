import { StockRecord } from '../../application/stock.types';
import { PrismaStockRepository } from './prisma-stock.repository';

const persistedStock = {
  id: 'stock-1',
  clientId: 'client-1',
  inputId: 'input-1',
  quantity: 16.5,
  updatedAt: new Date('2026-04-02T09:30:00.000Z'),
};

const expectedRecord: StockRecord = {
  id: 'stock-1',
  clientId: 'client-1',
  inputId: 'input-1',
  quantity: 16.5,
  updatedAt: new Date('2026-04-02T09:30:00.000Z'),
};

const expectedInclude = {
  input: { select: { name: true, unit: true } },
};

describe('PrismaStockRepository', () => {
  const prisma = {
    stock: { findMany: jest.fn(), findFirst: jest.fn() },
  };

  const repository = new PrismaStockRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists the balances of the client with a deterministic order', async () => {
    prisma.stock.findMany.mockResolvedValue([persistedStock]);

    await expect(repository.findAllByClient('client-1')).resolves.toEqual([
      expectedRecord,
    ]);

    expect(prisma.stock.findMany).toHaveBeenCalledWith({
      where: { clientId: 'client-1' },
      include: expectedInclude,
      orderBy: [{ inputId: 'asc' }],
    });
  });

  it('exposes the input catalogue name and unit additively', async () => {
    prisma.stock.findMany.mockResolvedValue([
      { ...persistedStock, input: { name: 'Glifosato', unit: 'L' } },
    ]);

    const [record] = await repository.findAllByClient('client-1');

    expect(record.inputName).toBe('Glifosato');
    expect(record.unit).toBe('L');
    expect(record.quantity).toBe(16.5);
  });

  it('reads a single balance keyed by client and input', async () => {
    prisma.stock.findFirst.mockResolvedValue(persistedStock);

    await expect(
      repository.findByClientAndInput('client-1', 'input-1'),
    ).resolves.toEqual(expectedRecord);

    expect(prisma.stock.findFirst).toHaveBeenCalledWith({
      where: { clientId: 'client-1', inputId: 'input-1' },
      include: expectedInclude,
    });
  });

  it('returns null when the client has no balance for the input', async () => {
    prisma.stock.findFirst.mockResolvedValue(null);

    await expect(
      repository.findByClientAndInput('client-1', 'input-9'),
    ).resolves.toBeNull();
  });

  it('never partitions the balance by company', async () => {
    prisma.stock.findMany.mockResolvedValue([persistedStock]);
    prisma.stock.findFirst.mockResolvedValue(persistedStock);

    await repository.findAllByClient('client-1');
    await repository.findByClientAndInput('client-1', 'input-1');

    const calls = JSON.stringify([
      ...prisma.stock.findMany.mock.calls,
      ...prisma.stock.findFirst.mock.calls,
    ]);

    expect(calls).not.toContain('companyId');
  });
});
