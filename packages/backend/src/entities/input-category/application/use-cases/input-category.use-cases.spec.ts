import { CategoryInUseError, DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { InputCategoryRepositoryPort } from '../input-category.ports';
import { CreateInputCategoryUseCase } from './create-input-category.use-case';
import { UpdateInputCategoryUseCase } from './update-input-category.use-case';
import { DeleteInputCategoryUseCase } from './delete-input-category.use-case';
import { FindInputCategoryUseCase } from './find-input-category.use-case';
import { FindAllInputCategoriesUseCase } from './find-all-input-categories.use-case';
const category = { id: 'c', tenantId: 't', name: 'Otro', active: true, version: 1, deleted: false, createdAt: new Date(), updatedAt: new Date() };
function repo(): jest.Mocked<InputCategoryRepositoryPort> {
  return { findAllByTenantId: jest.fn(), findByIdForTenant: jest.fn(), findByNameAndTenantId: jest.fn(), create: jest.fn(), updateForTenant: jest.fn(), deleteForTenant: jest.fn(), hasInputs: jest.fn() };
}
describe('Input category use cases', () => {
  it('scopes list and reads to tenant', async () => {
    const r = repo(); r.findAllByTenantId.mockResolvedValue([category]); r.findByIdForTenant.mockResolvedValue(category);
    await expect(new FindAllInputCategoriesUseCase(r).execute('t')).resolves.toEqual([category]);
    await expect(new FindInputCategoryUseCase(r).execute('c', 't')).resolves.toEqual(category);
    expect(r.findByIdForTenant).toHaveBeenCalledWith('c', 't');
  });
  it('does not reveal another tenant category', async () => {
    const r = repo(); r.findByIdForTenant.mockResolvedValue(null);
    await expect(new FindInputCategoryUseCase(r).execute('c', 'other')).rejects.toBeInstanceOf(EntityNotFoundError);
    await expect(new UpdateInputCategoryUseCase(r).execute('c', 'other', { name: 'X' })).rejects.toBeInstanceOf(EntityNotFoundError);
    await expect(new DeleteInputCategoryUseCase(r).execute('c', 'other')).rejects.toBeInstanceOf(EntityNotFoundError);
    expect(r.deleteForTenant).not.toHaveBeenCalled();
  });
  it('creates only a unique name within tenant and allows renaming defaults', async () => {
    const r = repo(); r.create.mockResolvedValue(category);
    await expect(new CreateInputCategoryUseCase(r).execute('t', { name: ' Otro ' })).resolves.toEqual(category);
    expect(r.create).toHaveBeenCalledWith({ tenantId: 't', name: 'Otro' });
    r.findByIdForTenant.mockResolvedValue(category); r.updateForTenant.mockResolvedValue({ ...category, name: 'Nuevo' });
    await expect(new UpdateInputCategoryUseCase(r).execute('c', 't', { name: 'Nuevo' })).resolves.toMatchObject({ name: 'Nuevo' });
    r.findByNameAndTenantId.mockResolvedValue(category);
    await expect(new CreateInputCategoryUseCase(r).execute('t', { name: 'Otro' })).rejects.toBeInstanceOf(DuplicateEntityError);
  });
  it('refuses deletion while referenced and deletes only unreferenced category', async () => {
    const r = repo(); r.findByIdForTenant.mockResolvedValue(category); r.hasInputs.mockResolvedValue(true);
    const useCase = new DeleteInputCategoryUseCase(r);
    await expect(useCase.execute('c', 't')).rejects.toBeInstanceOf(CategoryInUseError);
    expect(r.deleteForTenant).not.toHaveBeenCalled();
    r.hasInputs.mockResolvedValue(false);
    await expect(useCase.execute('c', 't')).resolves.toMatchObject({ message: expect.any(String) });
    expect(r.deleteForTenant).toHaveBeenCalledWith('c', 't');
  });
});
