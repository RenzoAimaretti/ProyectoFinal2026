import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReapplicationAlertReaderPort } from '../../application/recipe.ports';
import { RecipeForReapplicationAlert } from '../../application/recipe.types';

@Injectable()
export class PrismaReapplicationAlertReader
  implements ReapplicationAlertReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findCandidateRecipesForAlerts(
    tenantId: string,
  ): Promise<RecipeForReapplicationAlert[]> {
    const rows = await this.prisma.recipe.findMany({
      where: {
        lot: { farm: { client: { tenantId } } },
        status: 'ACTIVA',
        OR: [
          { reapplicationDate: { not: null } },
          { reapplicationIntervalDays: { not: null } },
        ],
      },
      select: {
        id: true,
        lotId: true,
        date: true,
        pest: true,
        crop: true,
        observations: true,
        sprayVolume: true,
        sprayVolumeUnit: true,
        reapplicationIntervalDays: true,
        reapplicationDate: true,
        taskId: true,
        task: {
          select: {
            status: true,
          },
        },
        lot: {
          select: {
            name: true,
            farm: {
              select: {
                name: true,
                client: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ date: 'desc' }],
    });

    return rows.map(
      (row): RecipeForReapplicationAlert => ({
        id: row.id,
        lotId: row.lotId,
        lotName: row.lot.name,
        farmName: row.lot.farm.name,
        clientName: row.lot.farm.client.name,
        taskId: row.taskId,
        taskStatus: row.task?.status ?? null,
        date: row.date,
        pest: row.pest,
        crop: row.crop,
        observations: row.observations,
        sprayVolume: row.sprayVolume,
        sprayVolumeUnit: row.sprayVolumeUnit,
        reapplicationIntervalDays: row.reapplicationIntervalDays,
        reapplicationDate: row.reapplicationDate,
      }),
    );
  }
}
