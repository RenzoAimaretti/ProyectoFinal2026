import { InputRepositoryPort } from '../input.ports';
import { InputRecord } from '../input.types';

export class FindAllInputsUseCase {
  constructor(private readonly repository: InputRepositoryPort) {}

  execute(tenantId: string): Promise<InputRecord[]> {
    return this.repository.findAllByTenantId(tenantId);
  }
}
