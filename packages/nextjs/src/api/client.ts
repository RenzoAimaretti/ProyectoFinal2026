const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

// Tipos del backend (Prisma serializado)
export type FarmDTO = {
  id: string;
  companyId: string;
  name: string;
  location: string | null;
  surface: number;
};

export type LotDTO = {
  id: string;
  farmId: string;
  name: string;
  coords: string | null;
  area: number;
  active: boolean;
};

export type TaskTypeDTO = { id: string; name: string; description: string | null };

export type TaskDTO = {
  id: string;
  lotId: string;
  taskTypeId: string;
  status: "PENDIENTE" | "EN_PROGRESO" | "FINALIZADA" | "CANCELADA";
  startedAt: string | null;
  finishedAt: string | null;
};

export type MachineDTO = {
  id: string;
  companyId: string;
  name: string;
  brand: string | null;
  status: "ACTIVA" | "MANTENIMIENTO" | "FUERA_SERVICIO";
};

export type LivestockDTO = {
  id: string;
  companyId: string;
  lotId: string | null;
  tagNumber: string;
  species: string;
  breed: string | null;
  sex: string;
  birthDate: string | null;
  status: "ACTIVO" | "VENDIDO" | "MUERTO" | "ENFERMO";
};

export type LivestockEventDTO = {
  id: string;
  livestockId: string;
  type: "VACUNACION" | "TRATAMIENTO" | "CASTRACION" | "INSEMINACION" | "PARTO" | "ENFERMEDAD";
  observations: string | null;
  eventDate: string;
};

export type WeightRecordDTO = {
  id: string;
  livestockId: string;
  weight: number;
  measuredAt: string;
};