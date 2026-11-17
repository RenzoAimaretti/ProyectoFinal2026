import { DuplicateEntityError } from '../../domain/errors';
import { InputCategoryRepositoryPort } from '../input-category.ports';
import { requiredName } from '../input-category.validation';
export class CreateInputCategoryUseCase {
  constructor(private readonly repository: InputCategoryRepositoryPort) {}
  async execute(tenantId: string, input: { name: string }) {
    const name = requiredName(input?.name);
    if (await this.repository.findByNameAndTenantId(name, tenantId)) throw new DuplicateEntityError('Input category already exists');
    return this.repository.create({ tenantId, name });
  }
}
