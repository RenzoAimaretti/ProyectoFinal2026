import { ModuleEntityRepositoryPort } from '../module-entity.ports';
import { ModuleEntityRecord } from '../module-entity.types';
import { assertRequiredString } from '../module-entity.validation';

export class FindModuleEntityByNameUseCase {
  constructor(private readonly repository: ModuleEntityRepositoryPort) {}

  execute(name: string): Promise<ModuleEntityRecord | null> {
    return this.repository.findByName(assertRequiredString(name, 'name'));
  }
}
