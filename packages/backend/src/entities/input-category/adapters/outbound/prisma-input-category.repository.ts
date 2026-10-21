import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { InputCategoryRepositoryPort } from '../../application/input-category.ports';
import { UpdateInputCategoryInput } from '../../application/input-category.types';
import { CategoryInUseError, DuplicateEntityError } from '../../domain/errors';

@Injectable()
export class PrismaInputCategoryRepository implements InputCategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}
  findAllByTenantId(tenantId: string) { return this.prisma.inputCategory.findMany({ where: { tenantId } }); }
  findByIdForTenant(id: string, tenantId: string) { return this.prisma.inputCategory.findFirst({ where: { id, tenantId } }); }
  findByNameAndTenantId(name: string, tenantId: string) { return this.prisma.inputCategory.findFirst({ where: { name, tenantId } }); }
  async create(data: { tenantId: string; name: string }) {
    try { return await this.prisma.inputCategory.create({ data }); }
    catch (error) { if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') throw new DuplicateEntityError('Input category already exists'); throw error; }
  }
  async updateForTenant(id: string, tenantId: string, data: UpdateInputCategoryInput) {
    try {
      const result = await this.prisma.inputCategory.updateMany({ where: { id, tenantId }, data });
      if (!result.count) throw new Error('Input category not found for tenant');
      return this.prisma.inputCategory.findFirstOrThrow({ where: { id, tenantId } });
    } catch (error) { if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') throw new DuplicateEntityError('Input category already exists'); throw error; }
  }
  async deleteForTenant(id: string, tenantId: string) {
    try {
      await this.prisma.inputCategory.delete({ where: { id, tenantId } });
    } catch (error) { if (error instanceof PrismaClientKnownRequestError && error.code === 'P2003') throw new CategoryInUseError('Input category still has inputs'); throw error; }
  }
  async hasInputs(id: string, tenantId: string) { return (await this.prisma.input.count({ where: { categoryId: id, tenantId } })) > 0; }
}
