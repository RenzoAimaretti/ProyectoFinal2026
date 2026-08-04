import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CreateFarmData,
  FarmEntity,
  FarmRepositoryPort,
  UpdateFarmData,
} from '../../../ports/farm.repository';

// ÚNICO archivo del módulo farm que importa prisma indirectamente vía
// PrismaService (REQ-A-04). El cross-read de empresa NO va por Prisma aquí:
// el service lo resuelve vía COMPANY_REPOSITORY exportado por el dueño
// (T-F2-15, REQ-F2-03).
@Injectable()
export class PrismaFarmRepository implements FarmRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<FarmEntity[]> {
    return this.prisma.farm.findMany();
  }

  async findById(id: string): Promise<FarmEntity | null> {
    return this.prisma.farm.findUnique({ where: { id } });
  }

  async findByCompany(companyId: string): Promise<FarmEntity[]> {
    return this.prisma.farm.findMany({ where: { companyId } });
  }

  async findByNameAndCompany(
    name: string,
    companyId: string,
  ): Promise<FarmEntity | null> {
    return this.prisma.farm.findFirst({ where: { name, companyId } });
  }

  async create(data: CreateFarmData): Promise<FarmEntity> {
    return this.prisma.farm.create({ data });
  }

  async update(id: string, data: UpdateFarmData): Promise<FarmEntity> {
    return this.prisma.farm.update({ where: { id }, data });
  }
}
