import { PrismaReceptionClientReader } from './prisma-reception-client.reader';
import { PrismaReceptionInputReader } from './prisma-reception-input.reader';

describe('Prisma reception readers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PrismaReceptionClientReader', () => {
    const prisma = { client: { findFirst: jest.fn() } };
    const reader = new PrismaReceptionClientReader(prisma as never);

    it('reads the tenant of the client that owns the reception', async () => {
      prisma.client.findFirst.mockResolvedValue({
        id: 'client-1',
        tenantId: 'tenant-1',
      });

      await expect(reader.findById('client-1')).resolves.toEqual({
        id: 'client-1',
        tenantId: 'tenant-1',
      });

      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        select: { id: true, tenantId: true },
      });
    });

    it('returns null when the client does not exist', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(reader.findById('client-9')).resolves.toBeNull();
    });
  });

  describe('PrismaReceptionInputReader', () => {
    const prisma = { input: { findMany: jest.fn() } };
    const reader = new PrismaReceptionInputReader(prisma as never);

    it('reads the catalogue unit of the requested inputs inside the tenant', async () => {
      prisma.input.findMany.mockResolvedValue([
        { id: 'input-1', unit: 'L' },
        { id: 'input-2', unit: 'kg' },
      ]);

      await expect(
        reader.findExistingForTenant(['input-1', 'input-2'], 'tenant-1'),
      ).resolves.toEqual([
        { id: 'input-1', unit: 'L' },
        { id: 'input-2', unit: 'kg' },
      ]);

      expect(prisma.input.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['input-1', 'input-2'] }, tenantId: 'tenant-1' },
        select: { id: true, unit: true },
      });
    });

    it('returns only the inputs of the tenant', async () => {
      prisma.input.findMany.mockResolvedValue([{ id: 'input-1', unit: 'L' }]);

      await expect(
        reader.findExistingForTenant(['input-1', 'input-2'], 'tenant-1'),
      ).resolves.toEqual([{ id: 'input-1', unit: 'L' }]);
    });
  });
});
