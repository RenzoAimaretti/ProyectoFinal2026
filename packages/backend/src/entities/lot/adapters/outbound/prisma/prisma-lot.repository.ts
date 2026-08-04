import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CreateLotData,
  LotEntity,
  LotRepositoryPort,
  UpdateLotData,
} from '../../../ports/lot.repository';

// ÚNICO archivo del módulo lot que importa prisma indirectamente vía
// PrismaService (REQ-A-04). Los cross-reads NO van por Prisma aquí:
// el service los resuelve vía FARM_REPOSITORY / COMPANY_REPOSITORY /
// LIVESTOCK_REPOSITORY exportados por sus dueños (T-F2-20, REQ-F2-03).
@Injectable()
export class PrismaLotRepository implements LotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<LotEntity[]> {
    return this.prisma.lot.findMany();
  }

  async findById(id: string): Promise<LotEntity | null> {
    return this.prisma.lot.findUnique({ where: { id } });
  }

  async findByNameAndFarm(
    name: string,
    farmId: string,
  ): Promise<LotEntity | null> {
    return this.prisma.lot.findFirst({ where: { name, farmId } });
  }

  async create(data: CreateLotData): Promise<LotEntity> {
    return this.prisma.lot.create({ data });
  }

  async update(id: string, data: UpdateLotData): Promise<LotEntity> {
    return this.prisma.lot.update({ where: { id }, data });
  }

  async assignStock(lotId: string, stockId: string): Promise<LotEntity> {
    return this.prisma.lot.update({
      where: { id: lotId },
      data: { livestock: { connect: { id: stockId } } },
    });
  }
}
