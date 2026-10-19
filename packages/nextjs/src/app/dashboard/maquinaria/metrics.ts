import type { MachineUsageDTO, MachineActivityDTO } from '@/api/client';

/** Legacy field usage is historical evidence only, never an input to accumulated totals. */
export function legacyFieldHistory<T extends Pick<MachineActivityDTO, 'type'>>(activities: T[]): T[] {
  return activities.filter(activity => activity.type === 'USO_CAMPO');
}

export function summarizeUsage(machineId: string, usages: Pick<MachineUsageDTO, 'machineId' | 'usageHours' | 'hectares'>[]) {
  return usages.reduce((totals, usage) => {
    if (usage.machineId === machineId) {
      totals.usageHours += usage.usageHours ?? 0;
      totals.hectares += usage.hectares ?? 0;
    }
    return totals;
  }, { usageHours: 0, hectares: 0 });
}

export function canManageFleet(role?: string | null): boolean {
  return role === 'ADMIN';
}
