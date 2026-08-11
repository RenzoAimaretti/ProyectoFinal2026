import { ModuleEntityRepositoryPort } from '../module-entity.ports';
import {
  ModuleEntityRecord,
  UpdateModuleEntityInput,
} from '../module-entity.types';
import {
  assertNonZeroPrice,
  assertRequiredString,
} from '../module-entity.validation';

export class UpdateModuleEntityUseCase {
  constructor(private readonly repository: ModuleEntityRepositoryPort) {}

  async execute(
    id: string,
    data: UpdateModuleEntityInput,
  ): Promise<ModuleEntityRecord> {
    const payload = (data ?? {}) as Partial<UpdateModuleEntityInput>;
    const name = assertRequiredString(payload.name, 'name');
    const price = assertNonZeroPrice(payload.price);
    const version = assertRequiredString(payload.version, 'version');

    return this.repository.update(id, { name, price, version });
  }
}
