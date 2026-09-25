/**
 * The owner kinds the Prisma `PhotoEntityType` enum supports. A photo is
 * polymorphic: `entityType` + `entityId` point at the owning entity and the
 * table stores no foreign key to it.
 */
export type PhotoEntityType =
  | 'PARTE_DIARIO'
  | 'RECEPCION'
  | 'ACTIVIDAD_MAQUINARIA';

export const PHOTO_ENTITY_TYPES: readonly PhotoEntityType[] = [
  'PARTE_DIARIO',
  'RECEPCION',
  'ACTIVIDAD_MAQUINARIA',
];
