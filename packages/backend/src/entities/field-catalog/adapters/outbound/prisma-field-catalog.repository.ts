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
///
/// The catalog is a full snapshot the mobile app reconciles against, so each
/// query excludes deleted rows and rows whose parent chain is deleted: a child
/// whose parent is missing would break the mobile foreign keys.
@Injectable()
export class PrismaFieldCatalogRepository implements FieldCatalogRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findCatalog(scope: FieldCatalogScope): Promise<FieldCatalog> {
    const liveClient = { tenantId: scope.tenantId, deleted: false };
    const liveFarm = { deleted: false, client: liveClient };
    const liveLot = { deleted: false, farm: liveFarm };
    const liveInput = { deleted: false, category: { deleted: false } };

    const [
      company,
      clients,
      farms,
      lots,
      laborTypes,
      machines,
      tasks,
      inputCategories,
      inputs,
      laborTypeCategories,
      recipes,
    ] = await Promise.all([
      this.prisma.company.findFirst({
        where: {
          id: scope.companyId,
          tenantId: scope.tenantId,
          deleted: false,
        },
        select: { id: true, name: true, cuit: true },
      }),
      this.prisma.client.findMany({
        where: liveClient,
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.farm.findMany({
        where: liveFarm,
        select: { id: true, clientId: true, name: true, surface: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.lot.findMany({
        where: liveLot,
        select: { id: true, farmId: true, name: true, area: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.laborType.findMany({
        where: { tenantId: scope.tenantId, deleted: false },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.machine.findMany({
        where: {
          companyId: scope.companyId,
          deleted: false,
          company: { deleted: false },
        },
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
        where: { deleted: false, lot: liveLot, laborType: { deleted: false } },
        select: {
          id: true,
          lotId: true,
          laborTypeId: true,
          status: true,
          operators: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inputCategory.findMany({
        where: { tenantId: scope.tenantId, deleted: false },
        select: { id: true, name: true, active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.input.findMany({
        where: { tenantId: scope.tenantId, ...liveInput },
        select: {
          id: true,
          name: true,
          unit: true,
          categoryId: true,
          active: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.laborTypeCategory.findMany({
        where: {
          laborType: { tenantId: scope.tenantId, deleted: false },
          category: { deleted: false },
        },
        select: { laborTypeId: true, categoryId: true },
      }),
      this.prisma.recipe.findMany({
        where: { status: 'ACTIVA', lot: liveLot },
        select: {
          id: true,
          lotId: true,
          date: true,
          observations: true,
          items: {
            where: { input: liveInput },
            select: {
              id: true,
              inputId: true,
              dose: true,
              unit: true,
              loadOrder: true,
            },
            orderBy: { loadOrder: 'asc' },
          },
        },
        orderBy: { date: 'desc' },
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
      inputCategories,
      inputs,
      laborTypeCategories,
      recipes,
    };
  }
}
