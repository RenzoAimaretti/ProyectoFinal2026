import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LivestockRepositoryPort } from '../../application/livestock.ports';
import {
  CreateLivestockInput,
  LivestockRecord,
  UpdateLivestockInput,
} from '../../application/livestock.types';

@Injectable()
export class PrismaLivestockRepository implements LivestockRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByCompanyId(companyId: string): Promise<LivestockRecord[]> {
    return this.prisma.livestock.findMany({
      where: { companyId },
    });
  }

  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<LivestockRecord | null> {
    return this.prisma.livestock.findFirst({
      where: { id, companyId },
    });
  }

  findByTagNumberAndCompanyId(
    tagNumber: string,
    companyId: string,
  ): Promise<LivestockRecord | null> {
    return this.prisma.livestock.findFirst({
      where: { tagNumber, companyId },
    });
  }

  create(data: CreateLivestockInput & { companyId: string }): Promise<LivestockRecord> {
    return this.prisma.livestock.create({
      data: {
        companyId: data.companyId,
        lotId: data.lotId ?? null,
        tagNumber: data.tagNumber,
        breed: data.breed ?? null,
        species: data.species,
        birthDate: data.birthDate,
        sex: data.sex,
      },
    });
  }

  async updateForCompany(
    id: string,
    companyId: string,
    data: UpdateLivestockInput,
  ): Promise<LivestockRecord> {
    const livestock = await this.prisma.livestock.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!livestock) {
      throw new Error(
        `Livestock with id ${id} not found for company ${companyId}`,
      );
    }

    return this.prisma.livestock.update({
      where: { id: livestock.id },
      data: {
        ...(data.lotId !== undefined ? { lotId: data.lotId } : {}),
        ...(data.tagNumber !== undefined ? { tagNumber: data.tagNumber } : {}),
        ...(data.breed !== undefined ? { breed: data.breed } : {}),
        ...(data.species !== undefined ? { species: data.species } : {}),
        ...(data.birthDate !== undefined ? { birthDate: data.birthDate } : {}),
        ...(data.sex !== undefined ? { sex: data.sex } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  async deleteForCompany(id: string, companyId: string): Promise<void> {
    const livestock = await this.prisma.livestock.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!livestock) {
      throw new Error(
        `Livestock with id ${id} not found for company ${companyId}`,
      );
    }

    await this.prisma.livestock.delete({ where: { id: livestock.id } });
  }
}
