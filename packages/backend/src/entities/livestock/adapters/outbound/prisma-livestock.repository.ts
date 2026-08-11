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

  findAll(): Promise<LivestockRecord[]> {
    return this.prisma.livestock.findMany();
  }

  findById(id: string): Promise<LivestockRecord | null> {
    return this.prisma.livestock.findUnique({
      where: { id },
    });
  }

  findByTagNumber(tagNumber: string): Promise<LivestockRecord | null> {
    return this.prisma.livestock.findUnique({
      where: { tagNumber },
    });
  }

  create(data: CreateLivestockInput): Promise<LivestockRecord> {
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

  update(id: string, data: UpdateLivestockInput): Promise<LivestockRecord> {
    return this.prisma.livestock.update({
      where: { id },
      data: {
        ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
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

  delete(id: string): Promise<void> {
    return this.prisma.livestock
      .delete({ where: { id } })
      .then(() => undefined);
  }
}
