import { PrismaClientRepository } from './prisma-client.repository';

describe('PrismaClientRepository', () => {
  const prisma = {
    client: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const repository = new PrismaClientRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list, read and duplicate checks by tenantId', async () => {
    prisma.client.findMany.mockResolvedValue([{ id: 'client-1' }]);
    prisma.client.findFirst.mockResolvedValue({ id: 'client-1' });

    await expect(repository.findAllByTenantId('tenant-1')).resolves.toEqual([
      { id: 'client-1' },
    ]);
    await expect(
      repository.findByIdForTenant('client-1', 'tenant-1'),
    ).resolves.toEqual({ id: 'client-1' });
    await expect(
      repository.findByNameAndTenantId('Acme S.A.', 'tenant-1'),
    ).resolves.toEqual({ id: 'client-1' });

    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
    });
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client-1', tenantId: 'tenant-1' },
    });
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { name: 'Acme S.A.', tenantId: 'tenant-1' },
    });
  });

  it('creates with the explicit tenant provided by the use case', async () => {
    prisma.client.create.mockResolvedValue({ id: 'client-2' });

    await expect(
      repository.create({
        tenantId: 'tenant-1',
        name: 'Acme S.A.',
        cuit: '30-12345678-9',
      }),
    ).resolves.toEqual({ id: 'client-2' });

    expect(prisma.client.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        name: 'Acme S.A.',
        cuit: '30-12345678-9',
      },
    });
  });

  it('applies the update atomically within the tenant scope', async () => {
    prisma.client.updateMany.mockResolvedValue({ count: 1 });
    prisma.client.findFirstOrThrow.mockResolvedValue({ id: 'client-1' });

    await expect(
      repository.updateForTenant('client-1', 'tenant-1', { name: 'New name' }),
    ).resolves.toEqual({ id: 'client-1' });

    expect(prisma.client.updateMany).toHaveBeenCalledWith({
      where: { id: 'client-1', tenantId: 'tenant-1' },
      data: { name: 'New name' },
    });
    expect(prisma.client.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: 'client-1', tenantId: 'tenant-1' },
    });
    expect(prisma.client.update).not.toHaveBeenCalled();
  });

  it('refuses to update a client outside the caller tenant', async () => {
    prisma.client.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.updateForTenant('client-1', 'tenant-2', { name: 'New name' }),
    ).rejects.toThrow('Client with id client-1 not found for tenant tenant-2');

    expect(prisma.client.updateMany).toHaveBeenCalledWith({
      where: { id: 'client-1', tenantId: 'tenant-2' },
      data: { name: 'New name' },
    });
    expect(prisma.client.findFirstOrThrow).not.toHaveBeenCalled();
    expect(prisma.client.update).not.toHaveBeenCalled();
  });
});
