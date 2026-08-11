import { DuplicateEntityError } from '../../domain/errors';
import { ModuleEntityRepositoryPort } from '../module-entity.ports';
import {
  CreateModuleEntityInput,
  ModuleEntityRecord,
} from '../module-entity.types';
import {
  assertPositivePrice,
  assertRequiredString,
} from '../module-entity.validation';

export class CreateModuleEntityUseCase {
  constructor(private readonly repository: ModuleEntityRepositoryPort) {}

  async execute(data: CreateModuleEntityInput): Promise<ModuleEntityRecord> {
    const payload = (data ?? {}) as Partial<CreateModuleEntityInput>;
    const name = assertRequiredString(payload.name, 'name');
    const price = assertPositivePrice(payload.price);
    const version = assertRequiredString(payload.version, 'version');

    const existing = await this.repository.findByName(name);
    if (existing) {
      throw new DuplicateEntityError('Module with this name already exists');
    }

    return this.repository.create({ name, price, version });
  }
}
