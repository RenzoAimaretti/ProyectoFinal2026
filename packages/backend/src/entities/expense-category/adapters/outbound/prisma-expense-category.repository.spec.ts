import { Prisma } from '../../../../../prisma/generated/client';
import { CategoryInUseError, DuplicateEntityError } from '../../domain/errors';
import { PrismaExpenseCategoryRepository } from './prisma-expense-category.repository';

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: 'test',
  });
}

function build() {
  const expenseCategory = {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'c1' }),
    create: jest.fn().mockResolvedValue({ id: 'c1' }),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    delete: jest.fn().mockResolvedValue({}),
  };
  const expense = { count: jest.fn().mockResolvedValue(0) };
  return {
    expenseCategory,
    expense,
    repository: new PrismaExpenseCategoryRepository({
      expenseCategory,
      expense,
    } as never),
  };
}

describe('PrismaExpenseCategoryRepository', () => {
  it('scopes every read and write by tenant', async () => {
    const { repository, expenseCategory } = build();

    await repository.findAllByTenantId('t1');
    await repository.findByIdForTenant('c1', 't1');
    await repository.findByNameAndTenantId('Flete', 't1');
    await repository.updateForTenant('c1', 't1', { active: false });
    await repository.deleteForTenant('c1', 't1');

    expect(expenseCategory.findMany).toHaveBeenCalledWith({
      where: { tenantId: 't1' },
      orderBy: { name: 'asc' },
    });
    expect(expenseCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 'c1', tenantId: 't1' },
    });
    expect(expenseCategory.findFirst).toHaveBeenCalledWith({
      where: { name: 'Flete', tenantId: 't1' },
    });
    expect(expenseCategory.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', tenantId: 't1' },
      data: { active: false },
    });
    expect(expenseCategory.delete).toHaveBeenCalledWith({
      where: { id: 'c1', tenantId: 't1' },
    });
  });

  it('counts expenses of the category, deleted ones included, to decide "in use"', async () => {
    const { repository, expense } = build();
    expense.count.mockResolvedValueOnce(2);

    await expect(repository.hasExpenses('c1', 't1')).resolves.toBe(true);
    expect(expense.count).toHaveBeenCalledWith({
      where: { categoryId: 'c1', category: { tenantId: 't1' } },
    });
  });

  it('translates P2002 to DuplicateEntityError on create and update', async () => {
    const { repository, expenseCategory } = build();
    expenseCategory.create.mockRejectedValueOnce(knownError('P2002'));
    expenseCategory.updateMany.mockRejectedValueOnce(knownError('P2002'));

    await expect(
      repository.create({ tenantId: 't1', name: 'Flete' }),
    ).rejects.toBeInstanceOf(DuplicateEntityError);
    await expect(
      repository.updateForTenant('c1', 't1', { name: 'Flete' }),
    ).rejects.toBeInstanceOf(DuplicateEntityError);
  });

  it('translates the FK violation P2003 on delete to CategoryInUseError and rethrows others', async () => {
    const { repository, expenseCategory } = build();
    expenseCategory.delete.mockRejectedValueOnce(knownError('P2003'));
    await expect(repository.deleteForTenant('c1', 't1')).rejects.toBeInstanceOf(
      CategoryInUseError,
    );

    const other = new Error('network');
    expenseCategory.delete.mockRejectedValueOnce(other);
    await expect(repository.deleteForTenant('c1', 't1')).rejects.toBe(other);
  });
});
