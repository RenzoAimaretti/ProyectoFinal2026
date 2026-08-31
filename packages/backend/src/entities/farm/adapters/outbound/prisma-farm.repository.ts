import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { FarmRepositoryPort } from '../../application/farm.ports';
import {
  CreateFarmInput,
  FarmRecord,
  UpdateFarmInput,
} from '../../application/farm.types';

@Injectable()
export class PrismaFarmRepository implements FarmRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByCompanyId(companyId: string): Promise<FarmRecord[]> {
    return this.prisma.farm.findMany({
      where: { companyId },
    });
  }

  findByIdForCompany(id: string, companyId: string): Promise<FarmRecord | null> {
    return this.prisma.farm.findFirst({
      where: { id, companyId },
    });
  }

  findByNameAndCompanyId(
    name: string,
    companyId: string,
  ): Promise<FarmRecord | null> {
    return this.prisma.farm.findFirst({
      where: { name, companyId },
    });
  }

  create(data: CreateFarmInput & { companyId: string }): Promise<FarmRecord> {
    return this.prisma.farm.create({
      data: {
        name: data.name,
        location: data.location,
        companyId: data.companyId,
        surface: data.surface,
      },
    });
  }

  async updateForCompany(
    id: string,
    companyId: string,
    data: UpdateFarmInput,
  ): Promise<FarmRecord> {
    const farm = await this.prisma.farm.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!farm) {
      throw new Error(`Farm with id ${id} not found for company ${companyId}`);
    }

    return this.prisma.farm.update({
      where: { id: farm.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.surface !== undefined ? { surface: data.surface } : {}),
      },
    });
  }
}
