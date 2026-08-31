import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LivestockMovementRepositoryPort } from '../../application/livestock-movement.ports';
import {
  CreateLivestockMovementData,
  LivestockMovementRecord,
} from '../../application/livestock-movement.types';

@Injectable()
export class PrismaLivestockMovementRepository implements LivestockMovementRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByCompanyId(companyId: string): Promise<LivestockMovementRecord[]> {
    return this.prisma.livestockMovement.findMany({
      where: {
        livestock: { companyId },
        lot: { farm: { companyId } },
      },
    });
  }

  findByIdForCompany(id: string, companyId: string): Promise<LivestockMovementRecord | null> {
    return this.prisma.livestockMovement.findFirst({
      where: {
        id,
        livestock: { companyId },
        lot: { farm: { companyId } },
      },
    });
  }

  create(data: CreateLivestockMovementData): Promise<LivestockMovementRecord> {
    return this.prisma.livestockMovement.create({
      data: {
        livestockId: data.livestockId,
        lotId: data.lotId,
        movementDate: data.movementDate,
        ...(data.observations !== undefined ? { observations: data.observations } : {}),
      },
    });
  }
}
