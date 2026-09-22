import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CompanyRepositoryPort } from '../../application/company.ports';
import {
  CompanyRecord,
  CompanyWithModules,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../../application/company.types';

@Injectable()
export class PrismaCompanyRepository implements CompanyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenantId(tenantId: string): Promise<CompanyRecord[]> {
    return this.prisma.company.findMany({ where: { tenantId } });
  }

  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<CompanyWithModules | null> {
    return this.prisma.company.findFirst({
      where: { id, tenantId },
      include: { modules: true },
    });
  }

  findByCuit(cuit: string): Promise<CompanyWithModules | null> {
    return this.prisma.company.findUnique({
      where: { cuit },
      include: { modules: true },
    });
  }

  create(data: CreateCompanyInput): Promise<CompanyRecord> {
    return this.prisma.company.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        cuit: data.cuit,
      },
    });
  }

  async updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateCompanyInput,
  ): Promise<CompanyRecord> {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!company) {
      throw new Error(`Company with id ${id} not found for tenant ${tenantId}`);
    }

    return this.prisma.company.update({
      where: { id: company.id },
      data,
    });
  }

  async addModuleForTenant(
    companyId: string,
    tenantId: string,
    moduleId: string,
  ): Promise<void> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });

    if (!company) {
      throw new Error(
        `Company with id ${companyId} not found for tenant ${tenantId}`,
      );
    }

    await this.prisma.company.update({
      where: { id: company.id },
      data: { modules: { connect: { id: moduleId } } },
    });
  }
}
