import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StockBalanceSummaryReaderPort } from '../../application/stock.ports';
import {
  StockBalanceSummaryData,
  StockBalanceSummaryInputRow,
} from '../../application/stock.types';

@Injectable()
export class PrismaStockBalanceSummaryReader
  implements StockBalanceSummaryReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  async readClientSummaryData(
    clientId: string,
  ): Promise<StockBalanceSummaryData> {
    const [stockRows, receptionItems, dailyReportItems, activeRecipes] =
      await Promise.all([
        this.prisma.stock.findMany({
          where: { clientId },
          select: {
            inputId: true,
            quantity: true,
            unit: true,
            input: { select: { name: true } },
          },
        }),
        this.prisma.receptionItem.findMany({
          where: {
            reception: { clientId, status: 'VALIDADA' },
            validatedQuantity: { not: null },
          },
          select: {
            inputId: true,
            validatedQuantity: true,
            unit: true,
            input: { select: { name: true } },
          },
        }),
        this.prisma.dailyReportItem.findMany({
          where: {
            dailyReport: {
              status: 'APROBADO',
              lot: { farm: { clientId } },
            },
          },
          select: {
            inputId: true,
            quantity: true,
            unit: true,
            input: { select: { name: true } },
          },
        }),
        this.prisma.recipe.findMany({
          where: {
            status: 'ACTIVA',
            lot: {
              deleted: false,
              farm: { clientId, deleted: false },
            },
          },
          select: {
            sprayVolume: true,
            lot: { select: { area: true } },
            items: {
              select: {
                inputId: true,
                dose: true,
                dosageBasis: true,
                input: { select: { name: true, unit: true } },
              },
            },
          },
        }),
      ]);

    const stocks: StockBalanceSummaryInputRow[] = stockRows.map((row) => ({
      inputId: row.inputId,
      inputName: row.input.name,
      unit: row.unit,
      quantity: row.quantity,
    }));

    const received: StockBalanceSummaryInputRow[] = receptionItems.map(
      (item) => ({
        inputId: item.inputId,
        inputName: item.input.name,
        unit: item.unit,
        quantity: item.validatedQuantity ?? 0,
      }),
    );

    const consumed: StockBalanceSummaryInputRow[] = dailyReportItems.map(
      (item) => ({
        inputId: item.inputId,
        inputName: item.input.name,
        unit: item.unit,
        quantity: item.quantity,
      }),
    );

    const planned: StockBalanceSummaryInputRow[] = [];
    for (const recipe of activeRecipes) {
      const lotArea = recipe.lot.area;
      const caldoTotal = recipe.sprayVolume * lotArea;
      for (const item of recipe.items) {
        const quantity =
          item.dosageBasis === 'CONCENTRACION'
            ? (item.dose * caldoTotal) / 100
            : item.dose * lotArea;
        planned.push({
          inputId: item.inputId,
          inputName: item.input.name,
          unit: item.input.unit,
          quantity,
        });
      }
    }

    return { stocks, received, consumed, planned };
  }
}
