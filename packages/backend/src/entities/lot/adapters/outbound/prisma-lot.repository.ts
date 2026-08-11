import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LotRepositoryPort } from '../../application/lot.ports';
import {
  CreateLotInput,
  LotRecord,
  UpdateLotInput,
} from '../../application/lot.types';

@Injectable()
export class PrismaLotRepository implements LotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<LotRecord[]> {
    return this.prisma.lot.findMany();
  }

  findById(id: string): Promise<LotRecord | null> {
    return this.prisma.lot.findUnique({
      where: { id },
    });
  }

  findByNameAndFarmId(name: string, farmId: string): Promise<LotRecord | null> {
    return this.prisma.lot.findFirst({
      where: { name, farmId },
    });
  }

  create(data: CreateLotInput): Promise<LotRecord> {
    return this.prisma.lot.create({
      data: {
        name: data.name,
        farmId: data.farmId,
        coords: data.coords,
        area: data.area,
      },
    });
  }

  update(id: string, data: UpdateLotInput): Promise<LotRecord> {
    return this.prisma.lot.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.farmId !== undefined ? { farmId: data.farmId } : {}),
        ...(data.coords !== undefined ? { coords: data.coords } : {}),
        ...(data.area !== undefined ? { area: data.area } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }
}
