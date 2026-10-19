import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MachineActivityRepositoryPort } from '../../application/machine-activity.ports';
import {
  MachineActivityRecord,
  RegisterMachineActivityData,
} from '../../application/machine-activity.types';
import { MachineActivityType } from '../../domain/machine-activity-type';
import { FuelMovement } from '../../domain/fuel-movement';

type MachineActivityRow = {
  id: string;
  machineId: string;
  companyId: string;
  type: MachineActivityType;
  fuelMovement?: FuelMovement | null;
  date: Date;
  liters: number | null;
  receipt: string | null;
  receiptFileKey?: string | null;
  cost: number | null;
  spareParts: string | null;
  usageHours: number | null;
  hectares: number | null;
  observations: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaMachineActivityRepository
  implements MachineActivityRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: RegisterMachineActivityData,
  ): Promise<MachineActivityRecord> {
    const activity = await this.prisma.machineActivity.create({
      data: {
        machineId: data.machineId,
        companyId: data.companyId,
        type: data.type,
        fuelMovement: data.fuelMovement ?? (data.type === 'COMBUSTIBLE' ? 'INCOME' : null),
        date: data.date,
        liters: data.liters,
        receipt: data.receipt,
        cost: data.cost,
        spareParts: data.spareParts,
        usageHours: data.usageHours,
        hectares: data.hectares,
        observations: data.observations,
      },
    });

    return this.toMachineActivityRecord(activity);
  }

  async findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<MachineActivityRecord | null> {
    const activity = await this.prisma.machineActivity.findFirst({
      where: { id, companyId },
    });

    return activity ? this.toMachineActivityRecord(activity) : null;
  }

  async findAllByCompany(companyId: string): Promise<MachineActivityRecord[]> {
    const activities = await this.prisma.machineActivity.findMany({
      where: { companyId },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    return activities.map((activity) =>
      this.toMachineActivityRecord(activity),
    );
  }

  async attachReceiptIfAbsent(id: string, companyId: string, key: string, mimeType: string): Promise<boolean> {
    const result = await this.prisma.machineActivity.updateMany({
      where: { id, companyId, type: 'COMBUSTIBLE', receiptFileKey: null },
      data: { receiptFileKey: key, receiptMimeType: mimeType },
    });
    return result.count === 1;
  }

  async findReceiptForCompany(id: string, companyId: string): Promise<{ key: string; mimeType: string } | null> {
    const activity = await this.prisma.machineActivity.findFirst({
      where: { id, companyId, type: 'COMBUSTIBLE' },
      select: { receiptFileKey: true, receiptMimeType: true },
    });
    if (!activity?.receiptFileKey || !activity.receiptMimeType) return null;
    return { key: activity.receiptFileKey, mimeType: activity.receiptMimeType };
  }

  private toMachineActivityRecord(
    activity: MachineActivityRow,
  ): MachineActivityRecord {
    return {
      id: activity.id,
      machineId: activity.machineId,
      companyId: activity.companyId,
      type: activity.type,
      fuelMovement: activity.type === 'COMBUSTIBLE' ? activity.fuelMovement ?? 'INCOME' : null,
      date: activity.date,
      liters: activity.liters,
      receipt: activity.receipt,
      hasReceipt: Boolean(activity.receiptFileKey),
      cost: activity.cost,
      spareParts: activity.spareParts,
      usageHours: activity.usageHours,
      hectares: activity.hectares,
      observations: activity.observations,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    };
  }
}
