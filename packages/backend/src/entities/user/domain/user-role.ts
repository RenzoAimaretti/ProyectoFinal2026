// Dominio: copia del enum generado por Prisma (REQ-F1-05, REQ-A-05).
// Miembros idénticos a prisma/generated/enums.ts — el adapter (T-F2-26) es el
// ÚNICO lugar del módulo que mapea el enum generado ↔ esta copia de dominio
// (REQ-A-04: prisma/generated solo se importa desde **/adapters/** y src/prisma/**).

export enum UserRole {
  ADMIN = 'ADMIN',
  OPERARIO = 'OPERARIO',
  PRODUCTOR = 'PRODUCTOR',
  CONTRATISTA = 'CONTRATISTA',
  VETERINARIO = 'VETERINARIO',
}
