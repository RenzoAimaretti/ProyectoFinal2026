import { PrismaInputStockReader } from './prisma-input-stock.reader';

describe('PrismaInputStockReader', () => {
  const prisma = {
    stock: { findFirst: jest.fn() },
  };

  const reader = new PrismaInputStockReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports true when the input backs a non-zero balance', async () => {
    prisma.stock.findFirst.mockResolvedValue({ id: 'stock-1' });

    await expect(reader.hasNonZeroBalance('input-1')).resolves.toBe(true);

    expect(prisma.stock.findFirst).toHaveBeenCalledWith({
      where: { inputId: 'input-1', quantity: { not: 0 } },
      select: { id: true },
    });
  });

  it('reports false when no non-zero balance exists', async () => {
    prisma.stock.findFirst.mockResolvedValue(null);

    await expect(reader.hasNonZeroBalance('input-1')).resolves.toBe(false);
  });
});
