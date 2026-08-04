import { Inject, Injectable } from '@nestjs/common';
import {
  MODULE_ENTITY_REPOSITORY,
  CreateModuleData,
  ModuleEntity,
  ModuleEntityRepositoryPort,
  UpdateModuleData,
} from './ports/module-entity.repository';

// Service refactorizado a puertos (T-F2-04): conserva EXACTAMENTE el contrato
// observable de antes (errores crudos, validaciones y mensajes byte-idénticos,
// REQ-C-01/03) — solo cambia el origen de datos (puerto inyectado en vez de
// PrismaService directo).
@Injectable()
export class ModuleEntityService {
  constructor(
    @Inject(MODULE_ENTITY_REPOSITORY)
    private readonly repository: ModuleEntityRepositoryPort,
  ) {}

  findAll(): Promise<ModuleEntity[]> {
    return this.repository.findAll();
  }

  findOne(id: string): Promise<ModuleEntity | null> {
    return this.repository.findById(id);
  }

  findByName(name: string): Promise<ModuleEntity | null> {
    return this.repository.findByName(name);
  }

  async create(data: CreateModuleData) {
    try {
      if (!data.name || !data.price || !data.version || data.price <= 0) {
        throw new Error('Missing required fields: name, price, and version');
      } else if (await this.findByName(data.name)) {
        throw new Error('Module with this name already exists');
      } else {
        return this.repository.create(data);
      }
    } catch {
      throw new Error('Error creating module');
    }
  }

  async update(id: string, data: UpdateModuleData) {
    try {
      if (!data.name || !data.price || !data.version) {
        throw new Error('Missing required fields: name, price, and version');
      } else {
        return this.repository.update(id, data);
      }
    } catch {
      throw new Error('Error updating module');
    }
  }
}
