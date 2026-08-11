import { ModuleEntityRepositoryPort } from '../module-entity.ports';
import { ModuleEntityRecord } from '../module-entity.types';

export class FindModuleEntityUseCase {
  constructor(private readonly repository: ModuleEntityRepositoryPort) {}

  execute(id: string): Promise<ModuleEntityRecord | null> {
    return this.repository.findById(id);
  }
}
