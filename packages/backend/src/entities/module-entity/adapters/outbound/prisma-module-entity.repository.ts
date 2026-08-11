import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ModuleEntityRepositoryPort } from '../../application/module-entity.ports';
import {
  CreateModuleEntityInput,
  ModuleEntityRecord,
  UpdateModuleEntityInput,
} from '../../application/module-entity.types';

@Injectable()
export class PrismaModuleEntityRepository implements ModuleEntityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<ModuleEntityRecord[]> {
    return this.prisma.module.findMany();
  }

  findById(id: string): Promise<ModuleEntityRecord | null> {
    return this.prisma.module.findUnique({
      where: { id },
    });
  }

  findByName(name: string): Promise<ModuleEntityRecord | null> {
    return this.prisma.module.findFirst({
      where: { name },
    });
  }

  create(data: CreateModuleEntityInput): Promise<ModuleEntityRecord> {
    return this.prisma.module.create({ data });
  }

  update(
    id: string,
    data: UpdateModuleEntityInput,
  ): Promise<ModuleEntityRecord> {
    return this.prisma.module.update({
      where: { id },
      data,
    });
  }
}
