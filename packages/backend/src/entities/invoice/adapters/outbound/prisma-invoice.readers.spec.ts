import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PrismaInvoiceClientReader,
  PrismaInvoiceCompanyReader,
  PrismaInvoiceTaskReader,
} from './prisma-invoice.readers';

describe('Invoice scope readers', () => {
  const company = {
    findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant' }),
  };
  const client = {
    findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant' }),
  };
  const task = {
    findFirst: jest.fn().mockResolvedValue({
      lot: { farm: { client: { id: 'client', tenantId: 'tenant' } } },
    }),
  };
  const prisma = { company, client, task } as unknown as PrismaService;
  beforeEach(() => jest.clearAllMocks());
  it('reads only non-deleted company and client tenants', async () => {
    expect(
      await new PrismaInvoiceCompanyReader(prisma).findTenantId('firm'),
    ).toBe('tenant');
    expect(company.findFirst).toHaveBeenCalledWith({
      where: { id: 'firm', deleted: false },
      select: { tenantId: true },
    });
    expect(
      await new PrismaInvoiceClientReader(prisma).findTenantId('client'),
    ).toBe('tenant');
    expect(client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client', deleted: false },
      select: { tenantId: true },
    });
  });
  it('resolves task ownership through lot, farm and client', async () => {
    expect(
      await new PrismaInvoiceTaskReader(prisma).findClientScope('task'),
    ).toEqual({ clientId: 'client', tenantId: 'tenant' });
    const [callArgs] = task.findFirst.mock.calls[0] as [
      { where: { id: string; deleted: boolean } },
    ];
    expect(callArgs.where).toMatchObject({ id: 'task', deleted: false });
  });
});
