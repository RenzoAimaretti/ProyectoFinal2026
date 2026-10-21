import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  LotHistory,
  LotLaborFact,
  LotRecipeFact,
} from '../../domain/lot-state';
import {
  LotHistoryByLotId,
  LotHistoryReaderPort,
} from '../../application/lot.ports';

@Injectable()
export class PrismaLotHistoryReader implements LotHistoryReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findHistoryByLotIds(
    lotIds: readonly string[],
  ): Promise<LotHistoryByLotId> {
    if (lotIds.length === 0) {
      return new Map();
    }

    const ids = [...lotIds];

    const [reports, tasks, recipes] = await Promise.all([
      this.prisma.dailyReport.findMany({
        // A rejected report describes work that did not happen.
        where: { lotId: { in: ids }, status: { not: 'RECHAZADO' } },
        select: {
          lotId: true,
          date: true,
          laborType: { select: { kind: true } },
        },
      }),
      this.prisma.task.findMany({
        // A pending task is a plan. Only a finished one is history, and it is
        // dated by when it finished rather than when it was created.
        where: {
          lotId: { in: ids },
          status: 'FINALIZADA',
          finishedAt: { not: null },
        },
        select: {
          lotId: true,
          finishedAt: true,
          laborType: { select: { kind: true } },
        },
      }),
      this.prisma.recipe.findMany({
        where: { lotId: { in: ids }, status: 'ACTIVA' },
        select: { lotId: true, date: true },
      }),
    ]);

    const labors = new Map<string, LotLaborFact[]>();
    const recipeFacts = new Map<string, LotRecipeFact[]>();

    for (const report of reports) {
      append(labors, report.lotId, {
        kind: report.laborType.kind,
        occurredAt: report.date,
      });
    }

    for (const task of tasks) {
      if (task.finishedAt === null) {
        continue;
      }

      append(labors, task.lotId, {
        kind: task.laborType.kind,
        occurredAt: task.finishedAt,
      });
    }

    for (const recipe of recipes) {
      append(recipeFacts, recipe.lotId, { occurredAt: recipe.date });
    }

    return new Map<string, LotHistory>(
      ids.map((id) => [
        id,
        {
          labors: labors.get(id) ?? [],
          recipes: recipeFacts.get(id) ?? [],
        },
      ]),
    );
  }
}

/** Every requested lot gets an entry, so the caller never has to tell absent from empty. */
function append<T>(target: Map<string, T[]>, lotId: string, value: T): void {
  const current = target.get(lotId);

  if (current) {
    current.push(value);
    return;
  }

  target.set(lotId, [value]);
}
