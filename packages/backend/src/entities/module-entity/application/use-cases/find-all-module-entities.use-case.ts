import { ModuleEntityRepositoryPort } from '../module-entity.ports';
import { ModuleEntityRecord } from '../module-entity.types';

export class FindAllModuleEntitiesUseCase {
  constructor(private readonly repository: ModuleEntityRepositoryPort) {}

  execute(): Promise<ModuleEntityRecord[]> {
    return this.repository.findAll();
  }
}
