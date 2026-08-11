import {
  CreateModuleEntityInput,
  ModuleEntityRecord,
  UpdateModuleEntityInput,
} from './module-entity.types';

export const MODULE_ENTITY_REPOSITORY = Symbol('MODULE_ENTITY_REPOSITORY');

export interface ModuleEntityRepositoryPort {
  findAll(): Promise<ModuleEntityRecord[]>;
  findById(id: string): Promise<ModuleEntityRecord | null>;
  findByName(name: string): Promise<ModuleEntityRecord | null>;
  create(data: CreateModuleEntityInput): Promise<ModuleEntityRecord>;
  update(
    id: string,
    data: UpdateModuleEntityInput,
  ): Promise<ModuleEntityRecord>;
}
