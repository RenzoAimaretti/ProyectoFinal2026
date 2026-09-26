export type MachineActivityType =
  | 'COMBUSTIBLE'
  | 'MANTENIMIENTO'
  | 'REPARACION'
  | 'USO_CAMPO';

export const MACHINE_ACTIVITY_TYPES: readonly MachineActivityType[] = [
  'COMBUSTIBLE',
  'MANTENIMIENTO',
  'REPARACION',
  'USO_CAMPO',
];
