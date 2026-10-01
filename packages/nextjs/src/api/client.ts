const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

/* ------------------------------------------------------------------ */
/* Auth session (client-side, localStorage)                            */
/* ------------------------------------------------------------------ */

export const TOKEN_KEY = "agro_token";
export const USER_KEY = "agro_user";
export const REFRESH_KEY = "agro_refresh";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  firmaId: string | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(accessToken: string, refreshToken: string, user: AuthUser): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** Clears the session and sends the user back to the login screen. */
export function handleUnauthorized(): void {
  clearAuth();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

/* ------------------------------------------------------------------ */
/* HTTP layer                                                          */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    if (body && typeof body === "object" && "code" in body) {
      const code = (body as { code?: unknown }).code;
      if (typeof code === "string") this.code = code;
    }
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

type RequestOptions = { redirectOn401?: boolean };

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload,
    cache: "no-store",
  });

  if (res.status === 401 && opts.redirectOn401 !== false) {
    handleUnauthorized();
  }

  if (!res.ok) {
    const errorBody = await parseBody(res);
    throw new ApiError(res.status, `${method} ${path} -> ${res.status}`, errorBody);
  }

  if (res.status === 204) return undefined as unknown as T;

  const data = await parseBody(res);
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body ?? {});
}

/* ------------------------------------------------------------------ */
/* Auth endpoints                                                      */
/* ------------------------------------------------------------------ */

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(res.status, `POST /auth/login -> ${res.status}`, await parseBody(res));
  }

  const data = (await res.json()) as AuthResponse;
  setAuth(data.accessToken, data.refreshToken, data.user);
  return data;
}

export function logout(): void {
  clearAuth();
}

/* ------------------------------------------------------------------ */
/* Daily reports (partes de trabajo)                                   */
/* ------------------------------------------------------------------ */

export type DailyReportStatus = "PENDIENTE_APROBACION" | "APROBADO" | "RECHAZADO";

export const DAILY_REPORT_STATUS_LABELS: Record<DailyReportStatus, string> = {
  PENDIENTE_APROBACION: "Pendiente de aprobación",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export type DailyReportItemDTO = {
  id: string;
  inputId: string;
  inputName: string;
  quantity: number;
  unit: string;
};

export type DailyReportDTO = {
  id: string;
  companyId: string;
  companyName: string;
  operatorId: string;
  operatorName: string;
  taskId: string;
  taskTypeId: string;
  taskTypeName: string;
  lotId: string;
  lotName: string;
  farmName: string;
  clientName: string;
  date: string;
  hectares: number;
  hours: number;
  status: DailyReportStatus;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  createdAt: string;
  updatedAt: string;
  items: DailyReportItemDTO[];
};

export type PhotoDTO = {
  id: string;
  entityType: string;
  entityId: string;
  localPath: string;
  orderIndex: number;
  createdAt: string;
};

export function listDailyReports(): Promise<DailyReportDTO[]> {
  return apiGet<DailyReportDTO[]>("/daily-reports");
}

export function getDailyReport(id: string): Promise<DailyReportDTO> {
  return apiGet<DailyReportDTO>(`/daily-reports/${id}`);
}

export function approveDailyReport(id: string): Promise<DailyReportDTO> {
  return apiPost<DailyReportDTO>(`/daily-reports/${id}/approve`, {});
}

export function rejectDailyReport(id: string, reason: string): Promise<DailyReportDTO> {
  return apiPost<DailyReportDTO>(`/daily-reports/${id}/reject`, { reason });
}

export function listDailyReportPhotos(id: string): Promise<PhotoDTO[]> {
  return apiGet<PhotoDTO[]>(`/daily-reports/${id}/photos`);
}

/* ------------------------------------------------------------------ */
/* Backend DTOs (Prisma serializado) — kept for backward compatibility */
/* ------------------------------------------------------------------ */

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
