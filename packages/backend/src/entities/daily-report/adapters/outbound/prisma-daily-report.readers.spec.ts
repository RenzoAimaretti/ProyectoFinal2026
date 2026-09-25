import { PrismaDailyReportCompanyReader } from './prisma-company.reader';
import { PrismaDailyReportInputReader } from './prisma-daily-report-input.reader';
import { PrismaDailyReportTaskReader } from './prisma-task.reader';

describe('PrismaDailyReport readers', () => {
  const prisma = {
    company: { findUnique: jest.fn() },
    task: { findUnique: jest.fn() },
    input: { findMany: jest.fn() },
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

    it('resolves the lot, the task type and the owning tenant from the referenced task', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        lot: { farm: { client: { tenantId: 'tenant-1' } } },
      });

      await expect(reader.findByIdWithScope('task-1')).resolves.toEqual({
        id: 'task-1',
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        tenantId: 'tenant-1',
      });

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        select: {
          id: true,
          lotId: true,
          taskTypeId: true,
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
});
