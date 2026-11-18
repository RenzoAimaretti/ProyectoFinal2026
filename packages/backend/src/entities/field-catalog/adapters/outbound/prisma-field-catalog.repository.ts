import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  FieldCatalog,
  FieldCatalogRepositoryPort,
  FieldCatalogScope,
} from '../../application/field-catalog.ports';

/// Read-only Prisma adapter for the mobile field catalog.
///
/// Every query is scoped: the company query uses the caller's own firma, the
/// taxonomy queries use the caller's tenant, and machines use the firma.
@Injectable()
export class PrismaFieldCatalogRepository implements FieldCatalogRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findCatalog(scope: FieldCatalogScope): Promise<FieldCatalog> {
    const [company, clients, farms, lots, laborTypes, machines, tasks] =
      await Promise.all([
        this.prisma.company.findFirst({
          where: { id: scope.companyId, tenantId: scope.tenantId },
          select: { id: true, name: true, cuit: true },
        }),
        this.prisma.client.findMany({
          where: { tenantId: scope.tenantId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.farm.findMany({
          where: { client: { tenantId: scope.tenantId } },
          select: { id: true, clientId: true, name: true, surface: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.lot.findMany({
          where: { farm: { client: { tenantId: scope.tenantId } } },
          select: { id: true, farmId: true, name: true, area: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.laborType.findMany({
          where: { tenantId: scope.tenantId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.machine.findMany({
          where: { companyId: scope.companyId },
          select: {
            id: true,
            companyId: true,
            name: true,
            brand: true,
            status: true,
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.task.findMany({
          where: { lot: { farm: { client: { tenantId: scope.tenantId } } } },
          select: {
            id: true,
            lotId: true,
            laborTypeId: true,
            status: true,
            operators: { select: { id: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    return {
      companies: company ? [company] : [],
      clients,
      farms,
      lots,
      laborTypes,
      machines,
      tasks,
    };
  }
}
