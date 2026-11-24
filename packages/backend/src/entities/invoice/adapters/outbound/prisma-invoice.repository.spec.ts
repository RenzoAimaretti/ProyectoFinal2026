import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaInvoiceRepository } from './prisma-invoice.repository';

describe('PrismaInvoiceRepository queries', () => {
  const findFirst = jest.fn().mockResolvedValue(null);
  const findMany = jest.fn().mockResolvedValue([]);
  const repository = new PrismaInvoiceRepository({
    invoice: { findFirst, findMany },
  } as unknown as PrismaService);
  beforeEach(() => jest.clearAllMocks());
  it('scopes lookups by firm and excludes deleted rows', async () => {
    await expect(
      repository.findByIdForCompany('invoice', 'firm'),
    ).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'invoice', companyId: 'firm', deleted: false },
      }),
    );
  });
  it('scopes lists by firm and excludes deleted rows', async () => {
    await expect(repository.findAllByCompany('firm')).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 'firm', deleted: false } }),
    );
  });
});
