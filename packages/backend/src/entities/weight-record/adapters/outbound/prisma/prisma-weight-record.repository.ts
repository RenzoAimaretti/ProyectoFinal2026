import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CreateWeightRecordData,
  UpdateWeightRecordData,
  WeightRecordEntity,
  WeightRecordRepositoryPort,
} from '../../../ports/weight-record.repository';

@Injectable()
export class PrismaWeightRecordRepository implements WeightRecordRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<WeightRecordEntity[]> {
    const rows = await this.prisma.weightRecord.findMany();
    return rows.map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<WeightRecordEntity | null> {
    const row = await this.prisma.weightRecord.findUnique({
      where: { id },
    });
    return row ? this.toEntity(row) : null;
  }

  async create(data: CreateWeightRecordData): Promise<WeightRecordEntity> {
    const row = await this.prisma.weightRecord.create({
      data: {
        livestockId: data.livestockId,
        operatorId: data.operatorId,
        weight: data.weight,
        measuredAt: data.measuredAt,
      },
    });
    return this.toEntity(row);
  }

  async update(
    id: string,
    data: UpdateWeightRecordData,
  ): Promise<WeightRecordEntity> {
    const row = await this.prisma.weightRecord.update({
      where: { id },
      data: {
        ...(data.operatorId !== undefined
          ? { operatorId: data.operatorId }
          : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
        ...(data.measuredAt !== undefined
          ? { measuredAt: data.measuredAt }
          : {}),
      },
    });
    return this.toEntity(row);
  }

  async delete(id: string): Promise<WeightRecordEntity> {
    const row = await this.prisma.weightRecord.delete({
      where: { id },
    });
    return this.toEntity(row);
  }

  private toEntity(row: WeightRecordEntity): WeightRecordEntity {
    return {
      id: row.id,
      livestockId: row.livestockId,
      operatorId: row.operatorId,
      weight: row.weight,
      measuredAt: row.measuredAt,
      createdAt: row.createdAt,
    };
  }
}
