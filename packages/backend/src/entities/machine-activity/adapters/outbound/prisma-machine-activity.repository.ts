import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MachineActivityRepositoryPort } from '../../application/machine-activity.ports';
import {
  MachineActivityRecord,
  RegisterMachineActivityData,
} from '../../application/machine-activity.types';
import { MachineActivityType } from '../../domain/machine-activity-type';

type MachineActivityRow = {
  id: string;
  machineId: string;
  companyId: string;
  type: MachineActivityType;
  date: Date;
  liters: number | null;
  receipt: string | null;
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

  private toMachineActivityRecord(
    activity: MachineActivityRow,
  ): MachineActivityRecord {
    return {
      id: activity.id,
      machineId: activity.machineId,
      companyId: activity.companyId,
      type: activity.type,
      date: activity.date,
      liters: activity.liters,
      receipt: activity.receipt,
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
