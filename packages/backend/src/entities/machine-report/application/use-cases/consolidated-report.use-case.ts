import { MachineReportRepositoryPort } from '../machine-report.ports';

type Metrics = {
  fuelPurchasedLiters: number;
  fuelConsumedLiters: number;
  fuelBalanceLiters: number;
  usageHours: number;
  hectares: number;
  maintenanceCost: number;
  repairCost: number;
};
const zero = (): Metrics => ({
  fuelPurchasedLiters: 0, fuelConsumedLiters: 0, fuelBalanceLiters: 0,
  usageHours: 0, hectares: 0, maintenanceCost: 0, repairCost: 0,
});

export class ConsolidatedReportUseCase {
  constructor(private readonly repository: MachineReportRepositoryPort) {}

  async execute(userId: string, tenantId: string) {
    const companies = await this.repository.memberships(userId, tenantId);
    const totals = zero();
    if (!companies.length) return { rows: [], totals };

    const ids = companies.map((company) => company.id);
    const [activities, usages] = await Promise.all([
      this.repository.activityTotals(tenantId, ids),
      this.repository.usageTotals(tenantId, ids),
    ]);
    const rows = companies.map((company) => ({ companyId: company.id, companyName: company.name, ...zero() }));
    const byId = new Map(rows.map((row) => [row.companyId, row]));
    for (const activity of activities) {
      const row = byId.get(activity.companyId);
      if (!row) continue;
      if (activity.type === 'COMBUSTIBLE') {
        if (activity.fuelMovement === 'CONSUMPTION' || activity.fuelMovement === 'CONSUMO') row.fuelConsumedLiters += activity.liters;
        else row.fuelPurchasedLiters += activity.liters;
      } else if (activity.type === 'MANTENIMIENTO') row.maintenanceCost += activity.cost;
      else if (activity.type === 'REPARACION') row.repairCost += activity.cost;
    }
    for (const usage of usages) {
      const row = byId.get(usage.companyId);
      if (!row) continue;
      row.usageHours += usage.usageHours;
      row.hectares += usage.hectares;
    }
    for (const row of rows) {
      row.fuelBalanceLiters = row.fuelPurchasedLiters - row.fuelConsumedLiters;
      for (const key of Object.keys(totals) as (keyof Metrics)[]) totals[key] += row[key];
    }
    return { rows, totals };
  }
}
