export const MACHINE_REPORT_REPOSITORY = Symbol('MACHINE_REPORT_REPOSITORY');

export type ActivityTotal = {
  companyId: string;
  type: string;
  fuelMovement: string | null;
  liters: number;
  cost: number;
};
export type UsageTotal = { companyId: string; usageHours: number; hectares: number };

export interface MachineReportRepositoryPort {
  memberships(userId: string, tenantId: string): Promise<{ id: string; name: string }[]>;
  activityTotals(tenantId: string, companyIds: string[]): Promise<ActivityTotal[]>;
  usageTotals(tenantId: string, companyIds: string[]): Promise<UsageTotal[]>;
}
