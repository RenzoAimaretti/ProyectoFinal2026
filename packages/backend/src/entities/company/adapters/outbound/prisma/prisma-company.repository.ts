import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CompanyEntity,
  CompanyRepositoryPort,
  CompanyWithModules,
  CreateCompanyData,
  UpdateCompanyData,
} from '../../../ports/company.repository';

// ÚNICO archivo del módulo company que importa prisma/generated indirectamente
// vía PrismaService (REQ-A-04). Las lecturas cruzadas de Module NO van por
// Prisma aquí: el service las resuelve vía MODULE_ENTITY_REPOSITORY (T-F2-08,
// REQ-F2-03).
@Injectable()
export class PrismaCompanyRepository implements CompanyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CompanyEntity[]> {
    return this.prisma.company.findMany();
  }

  async findById(id: string): Promise<CompanyEntity | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }

  async findByCuit(cuit: string): Promise<CompanyWithModules | null> {
    return this.prisma.company.findUnique({
      where: { cuit },
      include: { modules: true },
    });
  }

  async findByIdWithModules(id: string): Promise<CompanyWithModules | null> {
    return this.prisma.company.findUnique({
      where: { id },
      include: { modules: true },
    });
  }

  async create(data: CreateCompanyData): Promise<CompanyEntity> {
    return this.prisma.company.create({ data });
  }

  async update(id: string, data: UpdateCompanyData): Promise<CompanyEntity> {
    return this.prisma.company.update({ where: { id }, data });
  }

  async assignModule(companyId: string, moduleId: string): Promise<void> {
    await this.prisma.company.update({
      where: { id: companyId },
      data: { modules: { connect: { id: moduleId } } },
    });
  }
}
