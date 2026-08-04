import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CreateModuleData,
  ModuleEntity,
  ModuleEntityRepositoryPort,
  UpdateModuleData,
} from '../../../ports/module-entity.repository';

// ÚNICO archivo del módulo module-entity que importa prisma/generated
// indirectamente vía PrismaService (REQ-A-04): el adapter delega 1:1 en las
// llamadas Prisma que hoy hace el service (T-F2-03).
@Injectable()
export class PrismaModuleEntityRepository implements ModuleEntityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ModuleEntity[]> {
    return this.prisma.module.findMany();
  }

  async findById(id: string): Promise<ModuleEntity | null> {
    return this.prisma.module.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<ModuleEntity | null> {
    return this.prisma.module.findFirst({ where: { name } });
  }

  async create(data: CreateModuleData): Promise<ModuleEntity> {
    return this.prisma.module.create({ data });
  }

  async update(id: string, data: UpdateModuleData): Promise<ModuleEntity> {
    return this.prisma.module.update({ where: { id }, data });
  }
}
