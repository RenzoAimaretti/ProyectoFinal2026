import { PrismaDailyReportClientReader } from './prisma-daily-report-client.reader';
import { PrismaDailyReportCompanyReader } from './prisma-company.reader';
import { PrismaDailyReportInputReader } from './prisma-daily-report-input.reader';
import { PrismaDailyReportTaskReader } from './prisma-task.reader';

describe('PrismaDailyReport readers', () => {
  const prisma = {
    company: { findUnique: jest.fn() },
    task: { findUnique: jest.fn() },
    input: { findMany: jest.fn() },
    lot: { findFirst: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PrismaDailyReportCompanyReader', () => {
    const reader = new PrismaDailyReportCompanyReader(prisma as never);

    it('resolves the company and its tenant', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        tenantId: 'tenant-1',
      });

      await expect(reader.findById('company-1')).resolves.toEqual({
        id: 'company-1',
        tenantId: 'tenant-1',
      });

      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        select: { id: true, tenantId: true },
      });
    });

    it('returns null when the company does not exist', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(reader.findById('company-9')).resolves.toBeNull();
    });
  });

  describe('PrismaDailyReportTaskReader', () => {
    const reader = new PrismaDailyReportTaskReader(prisma as never);

    it('resolves the lot, the labor type and the owning tenant from the referenced task', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-type-1',
        lot: { farm: { client: { tenantId: 'tenant-1' } } },
      });

      await expect(reader.findByIdWithScope('task-1')).resolves.toEqual({
        id: 'task-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-type-1',
        tenantId: 'tenant-1',
      });

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        select: {
          id: true,
          lotId: true,
          laborTypeId: true,
          lot: {
            select: {
              farm: { select: { client: { select: { tenantId: true } } } },
            },
          },
        },
      });
    });

    it('returns null when the task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(reader.findByIdWithScope('task-9')).resolves.toBeNull();
    });
  });

  describe('PrismaDailyReportInputReader', () => {
    const reader = new PrismaDailyReportInputReader(prisma as never);

    it('resolves only the requested inputs owned by the tenant', async () => {
      prisma.input.findMany.mockResolvedValue([{ id: 'input-1' }]);

      await expect(
        reader.findExistingIdsForTenant(
          ['input-1', 'input-2'],
          'tenant-1',
        ),
      ).resolves.toEqual(['input-1']);

      expect(prisma.input.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['input-1', 'input-2'] }, tenantId: 'tenant-1' },
        select: { id: true },
      });
    });
  });

  describe('PrismaDailyReportClientReader', () => {
    const reader = new PrismaDailyReportClientReader(prisma as never);

    it('resolves the client that owns the stock through the farm of the worked lot', async () => {
      prisma.lot.findFirst.mockResolvedValue({
        farm: { clientId: 'client-1' },
      });

      await expect(reader.findClientIdByLotId('lot-1')).resolves.toBe(
        'client-1',
      );

      expect(prisma.lot.findFirst).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        select: { farm: { select: { clientId: true } } },
      });
    });

    it('returns null when the lot does not exist', async () => {
      prisma.lot.findFirst.mockResolvedValue(null);

      await expect(reader.findClientIdByLotId('lot-9')).resolves.toBeNull();
    });
  });
});
