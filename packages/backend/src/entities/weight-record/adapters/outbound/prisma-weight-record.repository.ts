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

  findAllByCompanyId(companyId: string): Promise<WeightRecordRecord[]> {
    return this.prisma.weightRecord.findMany({
      where: { livestock: { companyId } },
    });
  }

  findById(id: string): Promise<WeightRecordRecord | null> {
    return this.prisma.weightRecord.findUnique({ where: { id } });
  }

  findByIdForCompany(id: string, companyId: string): Promise<WeightRecordRecord | null> {
    return this.prisma.weightRecord.findFirst({
      where: { id, livestock: { companyId } },
    });
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

  async updateForCompany(
    id: string,
    companyId: string,
    data: UpdateWeightRecordData,
  ): Promise<WeightRecordRecord> {
    const record = await this.prisma.weightRecord.findFirst({
      where: { id, livestock: { companyId } },
      select: { id: true },
    });

    if (!record) {
      throw new Error(`Weight record with id ${id} not found for company ${companyId}`);
    }

    return this.prisma.weightRecord.update({
      where: { id: record.id },
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

  async deleteForCompany(id: string, companyId: string): Promise<void> {
    const record = await this.prisma.weightRecord.findFirst({
      where: { id, livestock: { companyId } },
      select: { id: true },
    });

    if (!record) {
      throw new Error(`Weight record with id ${id} not found for company ${companyId}`);
    }

    await this.prisma.weightRecord.delete({ where: { id: record.id } });
  }
}
