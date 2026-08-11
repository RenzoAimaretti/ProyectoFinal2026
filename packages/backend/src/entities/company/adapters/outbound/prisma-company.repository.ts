import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CompanyRepositoryPort } from '../../application/company.ports';
import {
  AddCompanyModuleInput,
  CompanyRecord,
  CompanyWithModules,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../../application/company.types';

@Injectable()
export class PrismaCompanyRepository implements CompanyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<CompanyRecord[]> {
    return this.prisma.company.findMany();
  }

  findById(id: string): Promise<CompanyWithModules | null> {
    return this.prisma.company.findUnique({
      where: { id },
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
    return this.prisma.company.create({ data });
  }

  update(id: string, data: UpdateCompanyInput): Promise<CompanyRecord> {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  addModule(data: AddCompanyModuleInput): Promise<void> {
    return this.prisma.company
      .update({
        where: { id: data.companyId },
        data: { modules: { connect: { id: data.moduleId } } },
      })
      .then(() => undefined);
  }
}
