export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

/**
 * Resolves a server-relative asset path (e.g. `/uploads/receptions/x.jpg`)
 * against the API base. Absolute URLs and `data:`/`blob:` URLs are returned
 * unchanged, so callers can safely render `<img src={assetUrl(photo.url)} />`.
 */
export function assetUrl(url: string): string {
  if (!url) return url;
  if (
    /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

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
  /**
   * Present after a client is provisioned with a generated password. The user
   * must go through `/onboarding` before reaching any dashboard route.
   */
  mustChangePassword?: boolean;
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

/**
 * Merges a partial update into the persisted session user (localStorage).
 * Returns the updated user, or null when there is no local session.
 */
export function updateStoredUser(partial: Partial<AuthUser>): AuthUser | null {
  const current = getStoredUser();
  if (!current) return null;
  const next: AuthUser = { ...current, ...partial };
  if (canUseStorage()) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(next));
  }
  return next;
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

export async function apiPost<T>(
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  return request<T>("POST", path, body ?? {}, opts);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("PUT", path, body ?? {});
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>("DELETE", path);
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

export type TaskOperatorDTO = {
  id: string;
  name: string | null;
};

export type TaskDTO = {
  id: string;
  lotId: string;
  taskTypeId: string;
  status: "PENDIENTE" | "EN_PROGRESO" | "FINALIZADA" | "CANCELADA";
  startedAt: string | null;
  finishedAt: string | null;
  /**
   * Enriched by `GET /tasks` and `GET /tasks/:id`. Optional so the UI keeps
   * working against an older backend that does not return it yet.
   */
  prescriptionStatus?: PrescriptionStatus;
  /**
   * Enriched by `GET /tasks`. Optional so the UI keeps working against an
   * older backend and can fall back to the lot/farm/task-type catalogues.
   */
  lotName?: string | null;
  farmName?: string | null;
  taskTypeName?: string | null;
  operators?: TaskOperatorDTO[] | null;
};

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export type CreateTaskBody = {
  lotId: string;
  taskTypeId: string;
  /** ISO timestamp built from the chosen date + time. */
  startedAt: string;
};

export function listTasks(): Promise<TaskDTO[]> {
  return apiGet<TaskDTO[]>("/tasks");
}

export function createTask(body: CreateTaskBody): Promise<TaskDTO> {
  return apiPost<TaskDTO>("/tasks", body);
}

/** Assigns an operator to a task (`POST /tasks/:id/:operatorId`). */
export function assignTaskOperator(
  taskId: string,
  operatorId: string,
): Promise<{ message: string }> {
  return apiPost<{ message: string }>(
    `/tasks/${encodeURIComponent(taskId)}/${encodeURIComponent(operatorId)}`,
    {},
  );
}

/* ------------------------------------------------------------------ */
/* Task types, farms and lots                                          */
/* ------------------------------------------------------------------ */

export function listTaskTypes(): Promise<TaskTypeDTO[]> {
  return apiGet<TaskTypeDTO[]>("/task-types");
}

export function listFarms(): Promise<FarmDTO[]> {
  return apiGet<FarmDTO[]>("/farms");
}

export function listLots(): Promise<LotDTO[]> {
  return apiGet<LotDTO[]>("/lots");
}

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

/* ------------------------------------------------------------------ */
/* Inputs catalogue (insumos)                                          */
/* ------------------------------------------------------------------ */

export type InputDTO = {
  id: string;
  name: string;
  unit: string;
};

export function listInputs(): Promise<InputDTO[]> {
  return apiGet<InputDTO[]>("/inputs");
}

/* ------------------------------------------------------------------ */
/* Clients (clientes / productores)                                    */
/* ------------------------------------------------------------------ */

export type ClientDTO = {
  id: string;
  name: string;
  cuit: string | null;
  active: boolean;
  /** Extra fields present in the Prisma record; optional for compatibility. */
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
};

export function listClients(): Promise<ClientDTO[]> {
  return apiGet<ClientDTO[]>("/clients");
}

/* ------------------------------------------------------------------ */
/* Client onboarding (POST /clients, /clients/me)                      */
/* ------------------------------------------------------------------ */

// No hardcoded default client password: the backend generates one per client
// (or reads CLIENT_DEFAULT_PASSWORD) and returns it from POST /clients.

export type ClientProfileLotDTO = {
  id: string;
  name: string;
  area: number;
  coords: string | null;
};

export type ClientProfileFarmDTO = {
  id: string;
  name: string;
  location: string | null;
  surface: number;
  lots: ClientProfileLotDTO[];
};

/** Shape returned by `GET /clients/me` and `PUT /clients/me`. */
export type ClientProfileDTO = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  farms: ClientProfileFarmDTO[];
};

export type CreateClientLot = {
  name: string;
  area: number;
  coords?: string | null;
};

export type CreateClientBody = {
  email: string;
  firstName: string;
  lastName: string;
  farmName: string;
  lots: CreateClientLot[];
  /** When omitted, the backend assigns the generic client password. */
  password?: string;
  phone?: string | null;
  address?: string | null;
};

/** Shape returned by `POST /clients`; includes the effective password. */
export type CreateClientResult = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  farms: ClientProfileFarmDTO[];
  lots: ClientProfileLotDTO[];
  password: string;
};

export type UpdateMyClientBody = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  address?: string | null;
};

/** ADMIN/SUPERVISOR: provisions a client, its productor user, farm and lots. */
export function createClientWithAccess(
  body: CreateClientBody,
): Promise<CreateClientResult> {
  return apiPost<CreateClientResult>("/clients", body);
}

/** Resolves the profile of the client linked to the authenticated user. */
export function getMyClient(): Promise<ClientProfileDTO> {
  return apiGet<ClientProfileDTO>("/clients/me");
}

/** Updates the authenticated client's own contact profile. */
export function updateMyClient(body: UpdateMyClientBody): Promise<ClientProfileDTO> {
  return apiPut<ClientProfileDTO>("/clients/me", body);
}

/**
 * Changes the authenticated user's password. A wrong current password returns
 * 401, so this call must NOT trigger the global sign-out redirect.
 */
export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiPost<{ message: string }>(
    "/auth/change-password",
    { currentPassword, newPassword },
    { redirectOn401: false },
  );
}

/* ------------------------------------------------------------------ */
/* Receptions (recepciones de insumos)                                 */
/* ------------------------------------------------------------------ */

export type ReceptionStatus = "PENDIENTE_VALIDACION" | "VALIDADA" | "RECHAZADA";

export const RECEPTION_STATUS_LABELS: Record<ReceptionStatus, string> = {
  PENDIENTE_VALIDACION: "Pendiente de validación",
  VALIDADA: "Validada",
  RECHAZADA: "Rechazada",
};

export type ReceptionItemDTO = {
  id: string;
  inputId: string;
  inputName: string;
  /** Expected quantity declared when the reception was created. */
  quantity: number;
  /** Quantity agreed by the administrator; null while pending. */
  validatedQuantity: number | null;
  /** Shortage (negative) or surplus (positive); null while pending. */
  variance: number | null;
  unit: string;
};

export type ReceptionPhotoDTO = {
  id: string;
  /** Server-relative path (e.g. `/uploads/receptions/x.jpg`); use `assetUrl`. */
  url: string;
  orderIndex: number;
  entityType?: string;
  entityId?: string;
  createdAt?: string;
};

export type ReceptionDTO = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  status: ReceptionStatus;
  rejectionReason: string | null;
  validatedAt: string | null;
  createdAt: string;
  items: ReceptionItemDTO[];
  /** Photos attached to the reception. Optional for backward compatibility. */
  photos?: ReceptionPhotoDTO[];
};

export type CreateReceptionBody = {
  clientId: string;
  date: string;
  items: { inputId: string; quantity: number }[];
};

export type ValidateReceptionItem = {
  inputId: string;
  validatedQuantity: number;
};

export function listReceptions(): Promise<ReceptionDTO[]> {
  return apiGet<ReceptionDTO[]>("/receptions");
}

export function getReception(id: string): Promise<ReceptionDTO> {
  return apiGet<ReceptionDTO>(`/receptions/${id}`);
}

export function createReception(body: CreateReceptionBody): Promise<ReceptionDTO> {
  return apiPost<ReceptionDTO>("/receptions", body);
}

export function validateReception(
  id: string,
  items: ValidateReceptionItem[],
): Promise<ReceptionDTO> {
  return apiPost<ReceptionDTO>(`/receptions/${id}/validate`, { items });
}

export function rejectReception(id: string, reason: string): Promise<ReceptionDTO> {
  return apiPost<ReceptionDTO>(`/receptions/${id}/reject`, { reason });
}

/** Attaches a compressed image (data URL) to a reception. */
export function uploadReceptionPhoto(
  id: string,
  dataUrl: string,
  orderIndex?: number,
): Promise<ReceptionPhotoDTO> {
  return apiPost<ReceptionPhotoDTO>(`/receptions/${id}/photos`, {
    dataUrl,
    orderIndex,
  });
}

export function listReceptionPhotos(id: string): Promise<ReceptionPhotoDTO[]> {
  return apiGet<ReceptionPhotoDTO[]>(`/receptions/${id}/photos`);
}

/* ------------------------------------------------------------------ */
/* Stock                                                               */
/* ------------------------------------------------------------------ */

export type StockDTO = {
  id: string;
  clientId: string;
  inputId: string;
  inputName: string;
  unit: string;
  quantity: number;
};

/** Derived stock level: below the campaign target, on target, or above it. */
export type StockStatus = "FALTANTE" | "OK" | "SOBRANTE";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  FALTANTE: "Faltante",
  OK: "OK",
  SOBRANTE: "Sobrante",
};

export function listStock(clientId?: string): Promise<StockDTO[]> {
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  return apiGet<StockDTO[]>(`/stock${query}`);
}

/* ------------------------------------------------------------------ */
/* Recipes (recetas / órdenes de aplicación)                           */
/* ------------------------------------------------------------------ */

export type RecipeStatus = "ACTIVA" | "ARCHIVADA";

export const RECIPE_STATUS_LABELS: Record<RecipeStatus, string> = {
  ACTIVA: "Activa",
  ARCHIVADA: "Archivada",
};

/**
 * How a row dose is expressed. Mirrors the backend `DosageBasis` enum.
 * `POR_HECTAREA`: the dose is the amount per hectare.
 * `CONCENTRACION`: the dose is the amount per 100 L of water, so a 1% v/v mix
 * is entered as `1`.
 */
export type DosageBasis = "POR_HECTAREA" | "CONCENTRACION";

export const DOSAGE_BASIS_VALUE_LIST: readonly DosageBasis[] = [
  "POR_HECTAREA",
  "CONCENTRACION",
];

export const DOSAGE_BASIS_LABELS: Record<DosageBasis, string> = {
  POR_HECTAREA: "Por hectárea",
  CONCENTRACION: "Concentración (por 100 L de agua)",
};

/**
 * A recipe row as returned by the reads. `dosageBasis`, `id` and `recipeId` are
 * additive fields of the new prescription endpoints. `unit` is normalised by the
 * server to a rate (`<base>/ha` or `<base>/100 L`). `total`, `perHectare` and
 * `per100L` are the three faces of the same amount (decision 14) and are present
 * only on `GET /recipes/:id` when the lot area is known.
 */
export type RecipeItemDTO = {
  id: string;
  recipeId: string;
  inputId: string;
  inputName: string | null;
  dose: number;
  dosageBasis: DosageBasis;
  unit: string | null;
  loadOrder: number;
  /** Computed total amount for the whole lot, in the row's base unit. */
  total?: number;
  /** The same amount expressed per hectare. Detail read only. */
  perHectare?: number;
  /** The same amount expressed per 100 L of caldo. Detail read only. */
  per100L?: number;
};

/**
 * A recipe record. The list read (`GET /recipes?lotId=`) deliberately does NOT
 * carry the lot area, so it has no computed totals.
 */
export type RecipeDTO = {
  id: string;
  lotId: string;
  taskId: string | null;
  date: string;
  status: RecipeStatus;
  pest: string | null;
  crop: string | null;
  observations: string | null;
  sprayVolume: number;
  sprayVolumeUnit: string;
  reapplicationIntervalDays: number | null;
  reapplicationDate: string | null;
  createdAt: string;
  updatedAt: string;
  items: RecipeItemDTO[];
};

/**
 * Single-recipe read (`GET /recipes/:id`): the recipe plus the lot area and the
 * computed totals it carries. `caldoTotal` and each item `total` are absent when
 * the lot area is unknown.
 */
export type RecipeDetailDTO = RecipeDTO & {
  lotArea?: number;
  caldoTotal?: number;
};

export function listRecipesByLot(lotId: string): Promise<RecipeDTO[]> {
  return apiGet<RecipeDTO[]>(`/recipes?lotId=${encodeURIComponent(lotId)}`);
}

/** Reads one prescription with its lot area and computed totals. */
export function getRecipe(id: string): Promise<RecipeDetailDTO> {
  return apiGet<RecipeDetailDTO>(`/recipes/${encodeURIComponent(id)}`);
}

export type RecipeItemInputBody = {
  inputId: string;
  dose: number;
  dosageBasis: DosageBasis;
  unit?: string;
  loadOrder: number;
};

/** Body of `POST /recipes`. Creating a prescription flips the task to CON_RECETA. */
export type CreateRecipeBody = {
  taskId: string;
  date: string;
  pest?: string;
  crop?: string;
  observations?: string;
  sprayVolume: number;
  sprayVolumeUnit: string;
  reapplicationIntervalDays?: number;
  reapplicationDate?: string;
  items: RecipeItemInputBody[];
};

/** Body of `PUT /recipes/:id`: the task link is fixed at creation. */
export type UpdateRecipeBody = Omit<CreateRecipeBody, "taskId">;

export function createRecipe(body: CreateRecipeBody): Promise<RecipeDetailDTO> {
  return apiPost<RecipeDetailDTO>("/recipes", body);
}

/** Edits a prescription. Returns 409 when its task has already started. */
export function updateRecipe(
  id: string,
  body: UpdateRecipeBody,
): Promise<RecipeDetailDTO> {
  return apiPut<RecipeDetailDTO>(`/recipes/${encodeURIComponent(id)}`, body);
}

/* ------------------------------------------------------------------ */
/* Prescriptions (recetas fitosanitarias — agronomist inbox)           */
/* ------------------------------------------------------------------ */

/**
 * Orthogonal to the execution `TaskStatus`: whether the task needs a
 * prescription and, if so, whether it already has one.
 */
export type PrescriptionStatus = "NO_REQUIERE" | "SIN_RECETA" | "CON_RECETA";

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  NO_REQUIERE: "No requiere receta",
  SIN_RECETA: "Sin receta",
  CON_RECETA: "Con receta",
};

/**
 * One row of `GET /prescriptions/pending`: a task still waiting for its
 * prescription, enriched with the display names the console renders.
 */
export type PendingPrescriptionTaskDTO = {
  id: string;
  lotId: string;
  lotName: string;
  farmName: string;
  /** Task-lot surface in hectares; the editor computes the caldo live from it. */
  lotArea: number;
  taskTypeId: string;
  taskTypeName: string;
  status: TaskDTO["status"];
  startedAt: string | null;
  prescriptionStatus: PrescriptionStatus;
};

/** Reads the agronomist inbox (`GET /prescriptions/pending`). */
export function listPendingPrescriptions(): Promise<PendingPrescriptionTaskDTO[]> {
  return apiGet<PendingPrescriptionTaskDTO[]>("/prescriptions/pending");
}

/* ------------------------------------------------------------------ */
/* Machine activities (actividades de maquinaria)                      */
/* ------------------------------------------------------------------ */

export type MachineActivityType = "COMBUSTIBLE" | "MANTENIMIENTO" | "REPARACION" | "USO_CAMPO";

export const MACHINE_ACTIVITY_TYPE_LABELS: Record<MachineActivityType, string> = {
  COMBUSTIBLE: "Combustible",
  MANTENIMIENTO: "Mantenimiento",
  REPARACION: "Reparación",
  USO_CAMPO: "Uso en campo",
};

export type MachineStatus = "ACTIVA" | "MANTENIMIENTO" | "FUERA_SERVICIO";

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  ACTIVA: "Activa",
  MANTENIMIENTO: "En mantenimiento",
  FUERA_SERVICIO: "Fuera de servicio",
};

export type MachineActivityDTO = {
  id: string;
  machineId: string;
  companyId: string;
  type: MachineActivityType;
  date: string;
  liters: number | null;
  receipt: string | null;
  cost: number | null;
  spareParts: string | null;
  usageHours: number | null;
  hectares: number | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMachineActivityBody = {
  machineId: string;
  type: MachineActivityType;
  date: string;
  liters?: number | null;
  receipt?: string | null;
  cost?: number | null;
  spareParts?: string | null;
  usageHours?: number | null;
  hectares?: number | null;
  observations?: string | null;
};

export function listMachineActivities(): Promise<MachineActivityDTO[]> {
  return apiGet<MachineActivityDTO[]>("/machine-activities");
}

export function createMachineActivity(
  body: CreateMachineActivityBody,
): Promise<MachineActivityDTO> {
  return apiPost<MachineActivityDTO>("/machine-activities", body);
}

/* ------------------------------------------------------------------ */
/* Livestock events and weight records                                 */
/* ------------------------------------------------------------------ */

export type LivestockEventType =
  | "VACUNACION"
  | "TRATAMIENTO"
  | "CASTRACION"
  | "INSEMINACION"
  | "PARTO"
  | "ENFERMEDAD";

export type CreateLivestockEventBody = {
  livestockId: string;
  eventType: LivestockEventType;
  eventDate: string;
  operatorId: string;
  obs?: string;
  vaccine?: string | null;
  dose?: number | null;
};

export function createLivestockEvent(
  body: CreateLivestockEventBody,
): Promise<LivestockEventDTO> {
  return apiPost<LivestockEventDTO>("/livestock-events", body);
}

export type CreateWeightRecordBody = {
  livestockId: string;
  operatorId: string;
  weight: number;
  measuredAt: string;
};

export function createWeightRecord(
  body: CreateWeightRecordBody,
): Promise<WeightRecordDTO> {
  return apiPost<WeightRecordDTO>("/weight-records", body);
}

/* ------------------------------------------------------------------ */
/* Users (personal)                                                    */
/* ------------------------------------------------------------------ */

export type UserRole =
  | "ADMIN"
  | "OPERARIO"
  | "SUPERVISOR"
  | "PRODUCTOR"
  | "CONTRATISTA"
  | "VETERINARIO"
  | "INGENIERO";

export type UserDTO = {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  active: boolean;
};

export type CreateUserBody = {
  email: string;
  username?: string;
  password: string;
  role: UserRole;
  companyId: string;
  active?: boolean;
};

export function listUsers(): Promise<UserDTO[]> {
  return apiGet<UserDTO[]>("/users");
}

export function createUser(body: CreateUserBody): Promise<UserDTO> {
  return apiPost<UserDTO>("/users", body);
}

/* ------------------------------------------------------------------ */
/* Machines and daily reports (creation)                               */
/* ------------------------------------------------------------------ */

export type CreateMachineBody = {
  name: string;
  brand: string;
  entryDate: string;
  companyId?: string;
};

export function createMachine(body: CreateMachineBody): Promise<MachineDTO> {
  return apiPost<MachineDTO>("/machines", body);
}

export type CreateDailyReportBody = {
  taskId: string;
  date: string;
  hectares: number;
  hours: number;
  items: { inputId: string; quantity: number; unit?: string }[];
  id?: string;
};

export function createDailyReport(body: CreateDailyReportBody): Promise<DailyReportDTO> {
  return apiPost<DailyReportDTO>("/daily-reports", body);
}
