import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WeightRecordRepositoryPort } from '../../application/weight-record.ports';
import {
  CreateWeightRecordData,
  UpdateWeightRecordData,
  WeightRecordRecord,
} from '../../application/weight-record.types';

@Injectable()
export class PrismaWeightRecordRepository implements WeightRecordRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<WeightRecordRecord[]> {
    return this.prisma.weightRecord.findMany();
  }

  findById(id: string): Promise<WeightRecordRecord | null> {
    return this.prisma.weightRecord.findUnique({ where: { id } });
  }

  create(data: CreateWeightRecordData): Promise<WeightRecordRecord> {
    return this.prisma.weightRecord.create({
      data: {
        livestockId: data.livestockId,
        operatorId: data.operatorId,
        weight: data.weight,
        measuredAt: data.measuredAt,
      },
    });
  }

  update(id: string, data: UpdateWeightRecordData): Promise<WeightRecordRecord> {
    return this.prisma.weightRecord.update({
      where: { id },
      data: {
        ...(data.operatorId !== undefined ? { operatorId: data.operatorId } : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
        ...(data.measuredAt !== undefined ? { measuredAt: data.measuredAt } : {}),
      },
    });
  }

  delete(id: string): Promise<void> {
    return this.prisma.weightRecord.delete({ where: { id } }).then(() => undefined);
  }
}
