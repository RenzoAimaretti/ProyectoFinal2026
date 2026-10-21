import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PendingPrescriptionReaderPort,
  TaskPrescriptionPort,
} from '../../application/recipe.ports';
import {
  CreateTaskPrescriptionData,
  PendingPrescriptionTask,
  RecipeRecord,
  TaskPrescriptionContext,
} from '../../application/recipe.types';
import { DEFAULT_DOSAGE_BASIS } from '../../domain/dosage-basis';
import { DuplicateEntityError } from '../../domain/errors';
import { RECIPE_ITEM_INCLUDE, toRecipeRecord } from './recipe.mapper';

/**
 * The task side of the prescription aggregate.
 *
 * Attaching a prescription writes two tables: the recipe (with its items) and
 * the task `prescriptionStatus`. Those two writes must succeed or fail
 * together, so `attachPrescription` owns a single `prisma.$transaction` and
 * performs both of them; the application layer never sees a transaction handle.
 * The task read is tenant-scoped through `task -> lot -> farm -> client`.
 *
 * It also serves the agronomist inbox read (`findPendingByTenant`), which is
 * scoped through the very same chain.
 */
@Injectable()
export class PrismaTaskPrescriptionAdapter
  implements TaskPrescriptionPort, PendingPrescriptionReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findContextByIdForTenant(
    taskId: string,
    tenantId: string,
  ): Promise<TaskPrescriptionContext | null> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        deleted: false,
        lot: { farm: { client: { tenantId } } },
      },
      select: {
        id: true,
        lotId: true,
        status: true,
        lot: { select: { area: true } },
        laborType: { select: { requiresPrescription: true } },
      },
    });

    if (!task) {
      return null;
    }

    return {
      id: task.id,
      lotId: task.lotId,
      status: task.status,
      laborTypeRequiresPrescription: task.laborType.requiresPrescription,
      lotArea: task.lot.area,
    };
  }

  async findPendingByTenant(
    tenantId: string,
  ): Promise<PendingPrescriptionTask[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        prescriptionStatus: 'SIN_RECETA',
        lot: { farm: { client: { tenantId } } },
      },
      select: {
        id: true,
        lotId: true,
        laborTypeId: true,
        status: true,
        startedAt: true,
        prescriptionStatus: true,
        lot: { select: { name: true, area: true, farm: { select: { name: true } } } },
        laborType: { select: { name: true } },
      },
      orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
    });

    return tasks.map(
      (task): PendingPrescriptionTask => ({
        id: task.id,
        lotId: task.lotId,
        lotName: task.lot.name,
        farmName: task.lot.farm.name,
        lotArea: task.lot.area,
        laborTypeId: task.laborTypeId,
        laborTypeName: task.laborType.name,
        status: task.status,
        startedAt: task.startedAt,
        prescriptionStatus: task.prescriptionStatus,
      }),
    );
  }

  async attachPrescription(
    data: CreateTaskPrescriptionData,
  ): Promise<RecipeRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const recipe = await tx.recipe.create({
          data: {
            lotId: data.lotId,
            taskId: data.taskId,
            date: data.date,
            status: data.status,
            pest: data.pest ?? null,
            crop: data.crop ?? null,
            observations: data.observations,
            reapplicationIntervalDays: data.reapplicationIntervalDays ?? null,
            reapplicationDate: data.reapplicationDate ?? null,
            sprayVolume: data.sprayVolume,
            sprayVolumeUnit: data.sprayVolumeUnit,
            items: {
              create: data.items.map((item) => ({
                inputId: item.inputId,
                dose: item.dose,
                dosageBasis: item.dosageBasis ?? DEFAULT_DOSAGE_BASIS,
                unit: item.unit,
                loadOrder: item.loadOrder,
              })),
            },
          },
          include: { items: RECIPE_ITEM_INCLUDE },
        });

        await tx.task.update({
          where: { id: data.taskId },
          data: { prescriptionStatus: 'CON_RECETA' },
        });

        return toRecipeRecord(recipe);
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateEntityError(
          `Task ${data.taskId} already has a prescription`,
        );
      }

      throw error;
    }
  }
}
