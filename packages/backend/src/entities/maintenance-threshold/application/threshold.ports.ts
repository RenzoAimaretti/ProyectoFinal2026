export const THRESHOLD_REPOSITORY = Symbol('THRESHOLD_REPOSITORY');
export const ALERT_MACHINE_READER = Symbol('ALERT_MACHINE_READER');
export const ALERT_USAGE_READER = Symbol('ALERT_USAGE_READER');

export type Threshold = { id: string; companyId: string; machineType: string; hoursLimit: number | null; hectaresLimit: number | null };
export type ThresholdLimits = Pick<Threshold, 'hoursLimit' | 'hectaresLimit'>;
export type AlertMachine = { id: string; companyId: string; type: string | null; name: string; [key: string]: unknown };
export type UsageTotal = { machineId: string; usageHours: number; hectares: number };

export interface ThresholdRepositoryPort {
  findAll(companyId: string): Promise<Threshold[]>;
  upsert(companyId: string, machineType: string, limits: ThresholdLimits): Promise<Threshold>;
  delete(companyId: string, machineType: string): Promise<boolean>;
}
export interface AlertMachineReaderPort {
  findAllByCompanyId(companyId: string): Promise<AlertMachine[]>;
}
export interface AlertUsageReaderPort {
  totalsForCompany(companyId: string): Promise<UsageTotal[]>;
}
