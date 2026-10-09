import { EntityNotFoundError } from '../../domain/errors';
import { LaborTypeCategoryRepositoryPort, LaborTypeInputCategoryReaderPort } from '../labor-type-category.ports';
import { FindLaborTypeCategoriesUseCase } from './find-labor-type-categories.use-case';
import { ReplaceLaborTypeCategoriesUseCase } from './replace-labor-type-categories.use-case';

const labor = { id: 'labor-1', tenantId: 'tenant-1', name: 'Spray', description: null };
const category = { id: 'category-1', tenantId: 'tenant-1', name: 'Spray', active: true, deleted: false, createdAt: new Date(), updatedAt: new Date(), version: 1 };

function setup() {
  const repository: jest.Mocked<LaborTypeCategoryRepositoryPort> = {
    findLaborTypeForTenant: jest.fn().mockResolvedValue(labor),
    findCategoriesForLaborType: jest.fn().mockResolvedValue([]),
    replaceCategoriesForTenant: jest.fn(),
  };
  const reader: jest.Mocked<LaborTypeInputCategoryReaderPort> = {
    findByIdsForTenant: jest.fn().mockResolvedValue([]),
  };
  return { repository, reader };
}

describe('Labor type categories', () => {
  it('rejects a foreign labor type exactly like a missing labor type on both endpoints', async () => {
    const { repository, reader } = setup();
    repository.findLaborTypeForTenant.mockResolvedValue(null);
    const find = new FindLaborTypeCategoriesUseCase(repository);
    const replace = new ReplaceLaborTypeCategoriesUseCase(repository, reader);
    await expect(find.execute('foreign-labor', 'tenant-1')).rejects.toThrow(new EntityNotFoundError('Labor type not found'));
    await expect(replace.execute('foreign-labor', 'tenant-1', { categoryIds: [] })).rejects.toThrow(new EntityNotFoundError('Labor type not found'));
    expect(repository.findLaborTypeForTenant).toHaveBeenCalledWith('foreign-labor', 'tenant-1');
    expect(repository.replaceCategoriesForTenant).not.toHaveBeenCalled();
  });

  it('replaces the complete set, removes an id on the second request and accepts an empty unrestricted set', async () => {
    const { repository, reader } = setup();
    const categories = [category, { ...category, id: 'category-2', name: 'Seeds' }];
    let assigned: string[] = [];
    reader.findByIdsForTenant.mockImplementation(async (ids) => categories.filter((item) => ids.includes(item.id)));
    repository.replaceCategoriesForTenant.mockImplementation(async (_id, _tenant, ids) => { assigned = [...ids]; });
    repository.findCategoriesForLaborType.mockImplementation(async () => categories.filter((item) => assigned.includes(item.id)));
    const replace = new ReplaceLaborTypeCategoriesUseCase(repository, reader);
    await expect(replace.execute('labor-1', 'tenant-1', { categoryIds: ['category-1', 'category-1', 'category-2'] })).resolves.toEqual(categories);
    await expect(replace.execute('labor-1', 'tenant-1', { categoryIds: ['category-2'] })).resolves.toEqual([categories[1]]);
    expect(assigned).toEqual(['category-2']);
    expect(repository.replaceCategoriesForTenant).toHaveBeenNthCalledWith(1, 'labor-1', 'tenant-1', ['category-1', 'category-2']);
    await expect(replace.execute('labor-1', 'tenant-1', { categoryIds: [] })).resolves.toEqual([]);
    expect(assigned).toEqual([]);
  });

  it('rejects a foreign category exactly like a missing category without replacing anything', async () => {
    const { repository, reader } = setup();
    reader.findByIdsForTenant.mockResolvedValue([]);
    const replace = new ReplaceLaborTypeCategoriesUseCase(repository, reader);
    await expect(replace.execute('labor-1', 'tenant-1', { categoryIds: ['foreign-category'] })).rejects.toThrow(new EntityNotFoundError('Input category not found'));
    await expect(replace.execute('labor-1', 'tenant-1', { categoryIds: ['missing-category'] })).rejects.toThrow(new EntityNotFoundError('Input category not found'));
    expect(reader.findByIdsForTenant).toHaveBeenCalledWith(['foreign-category'], 'tenant-1');
    expect(repository.replaceCategoriesForTenant).not.toHaveBeenCalled();
  });
});
