import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CreateLivestockMovementData,
  LivestockMovementEntity,
  LivestockMovementRepositoryPort,
} from '../../../ports/livestock-movement.repository';

@Injectable()
export class PrismaLivestockMovementRepository implements LivestockMovementRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<LivestockMovementEntity[]> {
    return this.prisma.livestockMovement.findMany();
  }

  async findById(id: string): Promise<LivestockMovementEntity | null> {
    return this.prisma.livestockMovement.findUnique({ where: { id } });
  }

  async create(
    data: CreateLivestockMovementData,
  ): Promise<LivestockMovementEntity> {
    return this.prisma.livestockMovement.create({ data });
  }
}
