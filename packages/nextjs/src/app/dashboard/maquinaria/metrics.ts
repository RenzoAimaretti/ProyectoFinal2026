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

/**
 * Common machine types offered in the panel. They are suggestions, not a closed
 * enum: any type already used by a machine or a threshold is merged in too.
 */
export const MACHINE_TYPE_DEFAULTS = [
  "Tractor",
  "Pulverizadora",
  "Sembradora",
  "Cosechadora",
  "Camioneta",
  "Acoplado",
  "Implemento",
] as const;

/**
 * Options for the machine-type and threshold-type selects. Values are trimmed
 * and deduplicated case-insensitively (keeping the first spelling), defaults
 * keep their curated order, and any other known type follows alphabetically.
 */
export function machineTypeOptions(known: (string | null | undefined)[]): string[] {
  const canonical = new Map<string, string>();
  const remember = (value: string | null | undefined) => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) return;
    const key = trimmed.toLocaleLowerCase("es");
    if (!canonical.has(key)) canonical.set(key, trimmed);
  };

  MACHINE_TYPE_DEFAULTS.forEach(remember);
  known.forEach(remember);

  return [...canonical.values()].sort((a, b) => a.localeCompare(b, "es"));
}
