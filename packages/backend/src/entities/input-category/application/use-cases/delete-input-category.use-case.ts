import { CategoryInUseError, EntityNotFoundError } from '../../domain/errors';
import { InputCategoryRepositoryPort } from '../input-category.ports';
export class DeleteInputCategoryUseCase {
  constructor(private readonly repository: InputCategoryRepositoryPort) {}
  async execute(id: string, tenantId: string) {
    if (!await this.repository.findByIdForTenant(id, tenantId)) throw new EntityNotFoundError('Input category not found');
    if (await this.repository.hasInputs(id, tenantId)) throw new CategoryInUseError('Input category still has inputs');
    await this.repository.deleteForTenant(id, tenantId);
    return { message: `Input category with id ${id} deleted successfully` };
  }
}
