import {
  CategoryInUseError,
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { ExpenseCategoryRepositoryPort } from '../expense-category.ports';
import {
  ExpenseCategoryRecord,
  UpdateExpenseCategoryInput,
} from '../expense-category.types';
import { CreateExpenseCategoryUseCase } from './create-expense-category.use-case';
import { DeleteExpenseCategoryUseCase } from './delete-expense-category.use-case';
import { FindAllExpenseCategoriesUseCase } from './find-all-expense-categories.use-case';
import { UpdateExpenseCategoryUseCase } from './update-expense-category.use-case';

class InMemoryExpenseCategories implements ExpenseCategoryRepositoryPort {
  readonly rows: ExpenseCategoryRecord[] = [];
  readonly inUse = new Set<string>();
  private sequence = 0;

  findAllByTenantId(tenantId: string) {
    return Promise.resolve(this.rows.filter((r) => r.tenantId === tenantId));
  }
  findByIdForTenant(id: string, tenantId: string) {
    return Promise.resolve(
      this.rows.find((r) => r.id === id && r.tenantId === tenantId) ?? null,
    );
  }
  findByNameAndTenantId(name: string, tenantId: string) {
    return Promise.resolve(
      this.rows.find((r) => r.name === name && r.tenantId === tenantId) ?? null,
    );
  }
  create(data: { tenantId: string; name: string }) {
    const row: ExpenseCategoryRecord = {
      id: `cat-${++this.sequence}`,
      tenantId: data.tenantId,
      name: data.name,
      active: true,
      createdAt: new Date('2026-11-23T10:00:00Z'),
      updatedAt: new Date('2026-11-23T10:00:00Z'),
    };
    this.rows.push(row);
    return Promise.resolve(row);
  }
  updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateExpenseCategoryInput,
  ) {
    const row = this.rows.find((r) => r.id === id && r.tenantId === tenantId)!;
    Object.assign(row, data);
    return Promise.resolve(row);
  }
  deleteForTenant(id: string, tenantId: string) {
    const index = this.rows.findIndex(
      (r) => r.id === id && r.tenantId === tenantId,
    );
    this.rows.splice(index, 1);
    return Promise.resolve();
  }
  hasExpenses(id: string) {
    return Promise.resolve(this.inUse.has(id));
  }
}

function build() {
  const repo = new InMemoryExpenseCategories();
  return {
    repo,
    create: new CreateExpenseCategoryUseCase(repo),
    update: new UpdateExpenseCategoryUseCase(repo),
    remove: new DeleteExpenseCategoryUseCase(repo),
    all: new FindAllExpenseCategoriesUseCase(repo),
  };
}

describe('Expense categories (R-FIN-09)', () => {
  it('creates a category with a trimmed name, active, scoped to the tenant', async () => {
    const { create, repo } = build();

    const created = await create.execute('tenant-1', { name: '  Flete ' });

    expect(created).toMatchObject({
      tenantId: 'tenant-1',
      name: 'Flete',
      active: true,
    });
    expect(repo.rows).toHaveLength(1);
  });

  it('rejects a blank name with 400-class InvalidInputError', async () => {
    const { create, repo } = build();

    await expect(
      create.execute('tenant-1', { name: '   ' }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(repo.rows).toHaveLength(0);
  });

  it('rejects a duplicated "Flete" in the same tenant (409) and keeps one row', async () => {
    const { create, repo } = build();
    await create.execute('tenant-1', { name: 'Flete' });

    await expect(
      create.execute('tenant-1', { name: 'Flete' }),
    ).rejects.toBeInstanceOf(DuplicateEntityError);
    expect(repo.rows).toHaveLength(1);
  });

  it('allows the same name in another tenant', async () => {
    const { create, repo } = build();
    await create.execute('tenant-1', { name: 'Flete' });

    await create.execute('tenant-2', { name: 'Flete' });

    expect(repo.rows).toHaveLength(2);
  });

  it('lists only the categories of the tenant', async () => {
    const { create, all } = build();
    await create.execute('tenant-1', { name: 'Flete' });
    await create.execute('tenant-2', { name: 'Otros' });

    const rows = await all.execute('tenant-1');

    expect(rows.map((r) => r.name)).toEqual(['Flete']);
  });

  it('refuses to delete a category in use (409) and keeps it; it can then be deactivated', async () => {
    const { create, remove, update, repo } = build();
    const created = await create.execute('tenant-1', { name: 'Flete' });
    repo.inUse.add(created.id);

    await expect(remove.execute(created.id, 'tenant-1')).rejects.toBeInstanceOf(
      CategoryInUseError,
    );
    expect(repo.rows).toHaveLength(1);

    const deactivated = await update.execute(created.id, 'tenant-1', {
      active: false,
    });
    expect(deactivated.active).toBe(false);
    expect(repo.rows[0].active).toBe(false);
  });

  it('deletes an unused category', async () => {
    const { create, remove, repo } = build();
    const created = await create.execute('tenant-1', { name: 'Flete' });

    await remove.execute(created.id, 'tenant-1');

    expect(repo.rows).toHaveLength(0);
  });

  it('answers not found for a category of another tenant on delete and update', async () => {
    const { create, remove, update } = build();
    const created = await create.execute('tenant-1', { name: 'Flete' });

    await expect(remove.execute(created.id, 'tenant-2')).rejects.toBeInstanceOf(
      EntityNotFoundError,
    );
    await expect(
      update.execute(created.id, 'tenant-2', { active: false }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('rejects renaming onto an existing name (409) and non-boolean active (400)', async () => {
    const { create, update } = build();
    await create.execute('tenant-1', { name: 'Flete' });
    const other = await create.execute('tenant-1', { name: 'Otros' });

    await expect(
      update.execute(other.id, 'tenant-1', { name: 'Flete' }),
    ).rejects.toBeInstanceOf(DuplicateEntityError);
    await expect(
      update.execute(other.id, 'tenant-1', { active: 'no' as never }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      update.execute(other.id, 'tenant-1', {}),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});
