"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Button,
  Card,
  EmptyState,
  HeroBand,
  Modal,
} from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdminRole, navItems } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import {
  PeopleIcon,
  PlusIcon,
  ProductionIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import {
  ApiError,
  assignTaskOperator,
  createTask,
  listFarms,
  listLots,
  listTaskTypes,
  listTasks,
  listUsers,
  type FarmDTO,
  type LotDTO,
  type TaskDTO,
  type TaskTypeDTO,
  type UserDTO,
} from "@/api/client";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type TaskStatus = TaskDTO["status"];

const pad2 = (value: number) => String(value).padStart(2, "0");

const dayFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Local YYYY-MM-DD for "today", matching the native date input value. */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local HH:mm for "now", matching the native time input value. */
function nowTimeKey(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Buckets an ISO timestamp into its local calendar day (YYYY-MM-DD). */
function localDayKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** HH:mm parsed locally from an ISO timestamp. */
function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Elapsed time between start and finish, only when both are usable. */
function fmtDuration(startedAt: string | null, finishedAt: string | null): string | null {
  if (!startedAt || !finishedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const totalMinutes = Math.round((end - start) / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** Combines a date key + time key into a local ISO timestamp. */
function toIso(dateKey: string, timeKey: string): string | null {
  if (!dateKey || !timeKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeKey.split(":").map(Number);
  if (!year || !month || !day || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function fmtDayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return dateKey;
  const label = dayFmt.format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Resolves the operator line without inventing data. */
function describeOperators(task: TaskDTO): string {
  if (!Array.isArray(task.operators) || task.operators.length === 0) {
    return "Sin operarios asignados";
  }
  const names = task.operators
    .map((operator) => operator?.name)
    .filter((name): name is string => Boolean(name && name.trim()));
  if (names.length > 0) return names.join(", ");
  return `${task.operators.length} ${
    task.operators.length === 1 ? "operario" : "operarios"
  }`;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | string | null;
    const apiMessage =
      body && typeof body === "object" && typeof body.message === "string"
        ? body.message
        : null;
    if (err.status === 400) return apiMessage ?? "Los datos enviados no son válidos.";
    if (err.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    if (err.status === 404) return "El recurso ya no existe o fue eliminado.";
    if (err.status === 409) return apiMessage ?? "La tarea ya fue modificada.";
    return `No se pudo completar la acción (código ${err.status}).`;
  }
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

/* ------------------------------------------------------------------ */
/* Status colours (semantic tokens from globals.css)                   */
/* ------------------------------------------------------------------ */

type StatusMeta = {
  label: string;
  /** Badge pill classes. */
  chip: string;
  /** Solid dot colour shared by the rail node and the legend. */
  dot: string;
  /** Left accent border of the task card. */
  border: string;
  /** Live pulse for in-progress tasks. */
  pulse: boolean;
};

const STATUS_META: Record<TaskStatus, StatusMeta> = {
  PENDIENTE: {
    label: "No iniciada",
    chip: "bg-warning-soft text-warning ring-1 ring-inset ring-warning/25",
    dot: "bg-warning",
    border: "border-l-warning",
    pulse: false,
  },
  EN_PROGRESO: {
    label: "En progreso",
    chip: "bg-info-soft text-info ring-1 ring-inset ring-info/25",
    dot: "bg-info",
    border: "border-l-info",
    pulse: true,
  },
  FINALIZADA: {
    label: "Finalizada",
    chip: "bg-success-soft text-success ring-1 ring-inset ring-success/25",
    dot: "bg-success",
    border: "border-l-success",
    pulse: false,
  },
  CANCELADA: {
    label: "Cancelada",
    chip: "bg-danger-soft text-danger ring-1 ring-inset ring-danger/20",
    dot: "bg-danger/50",
    border: "border-l-danger/40",
    pulse: false,
  },
};

const STATUS_ORDER: TaskStatus[] = [
  "PENDIENTE",
  "EN_PROGRESO",
  "FINALIZADA",
  "CANCELADA",
];

type TimelineRow = {
  task: TaskDTO;
  taskTypeName: string;
  farmName: string;
  lotName: string;
  operatorsLabel: string;
  time: string | null;
  duration: string | null;
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProduccionPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [lots, setLots] = useState<LotDTO[]>([]);
  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskTypeDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      listTasks(),
      listLots(),
      listFarms(),
      listTaskTypes(),
      listUsers(),
    ])
      .then(([taskList, lotList, farmList, typeList, userList]) => {
        if (!alive) return;
        setTasks(Array.isArray(taskList) ? taskList : []);
        setLots(Array.isArray(lotList) ? lotList : []);
        setFarms(Array.isArray(farmList) ? farmList : []);
        setTaskTypes(Array.isArray(typeList) ? typeList : []);
        setUsers(Array.isArray(userList) ? userList : []);
      })
      .catch((err) => {
        if (alive) setError(describeError(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [version]);

  const lotById = useMemo(() => new Map(lots.map((lot) => [lot.id, lot])), [lots]);
  const farmById = useMemo(() => new Map(farms.map((farm) => [farm.id, farm])), [farms]);
  const typeById = useMemo(
    () => new Map(taskTypes.map((type) => [type.id, type])),
    [taskTypes],
  );

  /** Tasks of the selected day, ordered by start time ascending. */
  const dayTasks = useMemo(
    () =>
      tasks
        .filter((task) => localDayKey(task.startedAt) === selectedDate)
        .sort((a, b) => {
          const at = a.startedAt ? new Date(a.startedAt).getTime() : Number.POSITIVE_INFINITY;
          const bt = b.startedAt ? new Date(b.startedAt).getTime() : Number.POSITIVE_INFINITY;
          return at - bt;
        }),
    [tasks, selectedDate],
  );

  const counts = useMemo(() => {
    const acc: Record<TaskStatus, number> = {
      PENDIENTE: 0,
      EN_PROGRESO: 0,
      FINALIZADA: 0,
      CANCELADA: 0,
    };
    dayTasks.forEach((task) => {
      acc[task.status] += 1;
    });
    return acc;
  }, [dayTasks]);

  const rows = useMemo<TimelineRow[]>(
    () =>
      dayTasks.map((task) => {
        const lot = lotById.get(task.lotId);
        const farmName =
          task.farmName ??
          (lot ? farmById.get(lot.farmId)?.name : undefined) ??
          "Sin campo";
        return {
          task,
          taskTypeName:
            task.taskTypeName ?? typeById.get(task.taskTypeId)?.name ?? "Sin labor",
          farmName,
          lotName: task.lotName ?? lot?.name ?? "Sin lote",
          operatorsLabel: describeOperators(task),
          time: fmtTime(task.startedAt),
          duration: fmtDuration(task.startedAt, task.finishedAt),
        };
      }),
    [dayTasks, lotById, farmById, typeById],
  );

  /* ----- Create task modal ----- */
  const [createOpen, setCreateOpen] = useState(false);
  const [createFarmId, setCreateFarmId] = useState("");
  const [createLotId, setCreateLotId] = useState("");
  const [createTaskTypeId, setCreateTaskTypeId] = useState("");
  const [createDate, setCreateDate] = useState(todayKey);
  const [createTime, setCreateTime] = useState(nowTimeKey);
  const [createOperatorId, setCreateOperatorId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const farmOptions = useMemo(
    () => farms.map((farm) => ({ value: farm.id, label: farm.name })),
    [farms],
  );
  const lotOptions = useMemo(
    () =>
      lots
        .filter((lot) => lot.farmId === createFarmId)
        .map((lot) => ({ value: lot.id, label: lot.name })),
    [lots, createFarmId],
  );
  const taskTypeOptions = useMemo(
    () => taskTypes.map((type) => ({ value: type.id, label: type.name })),
    [taskTypes],
  );
  const operatorOptions = useMemo(
    () => [
      { value: "", label: "Sin asignar" },
      ...users
        .filter((u) => u.role === "OPERARIO" && u.active !== false)
        .map((u) => ({ value: u.id, label: u.username ?? u.email })),
    ],
    [users],
  );

  const openCreate = useCallback(() => {
    setCreateFarmId("");
    setCreateLotId("");
    setCreateTaskTypeId("");
    // `selectedDate` defaults to today, so the default is "today" in the common case.
    setCreateDate(selectedDate || todayKey());
    setCreateTime(nowTimeKey());
    setCreateOperatorId("");
    setCreateError(null);
    setCreateOpen(true);
  }, [selectedDate]);

  const canCreate = farms.length > 0 && taskTypes.length > 0;
  const createBlockedReason =
    farms.length === 0
      ? "Cargá al menos un campo para crear una tarea."
      : taskTypes.length === 0
        ? "Cargá al menos una labor para crear una tarea."
        : undefined;

  const handleCreate = useCallback(async () => {
    if (creating) return;
    if (!createFarmId) {
      setCreateError("Seleccioná un campo.");
      return;
    }
    if (!createLotId) {
      setCreateError("Seleccioná un lote.");
      return;
    }
    if (!createTaskTypeId) {
      setCreateError("Seleccioná una labor.");
      return;
    }
    if (!createDate) {
      setCreateError("Indicá una fecha.");
      return;
    }
    const startedAt = toIso(createDate, createTime);
    if (!startedAt) {
      setCreateError("Indicá una hora válida.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const created = await createTask({
        lotId: createLotId,
        taskTypeId: createTaskTypeId,
        startedAt,
      });

      let assignmentFailed = false;
      if (createOperatorId) {
        try {
          await assignTaskOperator(created.id, createOperatorId);
        } catch {
          assignmentFailed = true;
        }
      }

      if (assignmentFailed) {
        toast.error(
          "La tarea se creó, pero no se pudo asignar el operario.",
          "Asignación pendiente",
        );
      } else if (createOperatorId) {
        toast.success("Tarea creada y operario asignado.");
      } else {
        toast.success("Tarea creada sin operario asignado.");
      }

      setCreateOpen(false);
      refresh();
    } catch (err) {
      const message = describeError(err);
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }, [
    creating,
    createFarmId,
    createLotId,
    createTaskTypeId,
    createDate,
    createTime,
    createOperatorId,
    toast,
    refresh,
  ]);

  const dayLabel = selectedDate ? fmtDayLabel(selectedDate) : "la fecha seleccionada";

  return (
    <DashboardLayout
      title="Producción"
      sidebarItems={navItems}
      breadcrumb="Línea de tiempo diaria de labores por campo y lote"
    >
      <HeroBand
        kicker="Línea de tiempo del día"
        title="Tareas del día"
        description="Tareas iniciadas en la fecha seleccionada, ordenadas por hora de inicio y coloreadas por estado."
        icon={<ProductionIcon className="h-6 w-6" />}
        metric={dayTasks.length}
        metricLabel="Tareas del día"
        metricHint={`${counts.FINALIZADA} finalizadas`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon className="h-4 w-4" />
              Actualizar
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={openCreate}
                disabled={!canCreate}
                title={createBlockedReason}
                className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2.5 text-sm font-semibold text-agro-green-deep transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusIcon className="h-4 w-4" />
                Nueva tarea
              </button>
            )}
          </div>
        }
      />

      {/* Day selector + status legend */}
      <div className="mb-5 rounded-card-lg border border-agro-border bg-card px-5 py-4 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full sm:w-56">
            <TextField
              label="Fecha"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <p className="text-xs text-ink-faint">
            {selectedDate ? dayLabel : "Elegí una fecha para ver sus tareas."}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS_ORDER.map((status) => {
            const meta = STATUS_META[status];
            return (
              <div
                key={status}
                className="flex items-center gap-2 rounded-lg border border-agro-border bg-base-subtle/40 px-3 py-2"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                <span className="truncate text-xs font-medium text-ink-soft">
                  {meta.label}
                </span>
                <span className="text-numeric ml-auto text-sm font-semibold text-ink">
                  {counts[status]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <Alert tone="error" title="No se pudo cargar la línea de tiempo" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="secondary" onClick={refresh}>
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      {loading ? (
        <TimelineSkeleton />
      ) : error ? null : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ProductionIcon />}
            title={selectedDate ? "No hay tareas para esta fecha" : "Seleccioná una fecha"}
            subtitle={
              selectedDate
                ? `No se registraron tareas iniciadas el ${dayLabel}.`
                : "Elegí un día para ver sus tareas."
            }
          />
        </Card>
      ) : (
        <ol className="space-y-0">
          {rows.map((row, index) => {
            const { task, taskTypeName, farmName, lotName, operatorsLabel, time, duration } =
              row;
            const meta = STATUS_META[task.status];
            const isFirst = index === 0;
            const isLast = index === rows.length - 1;
            return (
              <li
                key={task.id}
                className="grid grid-cols-1 sm:grid-cols-[4.5rem_1.5rem_1fr] sm:gap-x-4"
              >
                {/* Hour rail (desktop) */}
                <div className="hidden pt-4 text-right sm:block">
                  <time className="text-numeric text-sm font-semibold text-ink-soft">
                    {time ?? "—"}
                  </time>
                </div>

                {/* Vertical rail + node */}
                <div className="relative hidden justify-center sm:flex" aria-hidden="true">
                  {!isFirst && (
                    <span className="absolute left-1/2 top-0 h-[22px] w-px -translate-x-1/2 bg-agro-border" />
                  )}
                  {!isLast && (
                    <span className="absolute bottom-0 left-1/2 top-[22px] w-px -translate-x-1/2 bg-agro-border" />
                  )}
                  <span className="absolute left-1/2 top-4 -translate-x-1/2">
                    {meta.pulse && (
                      <span
                        className={`animate-pulse-soft absolute -inset-1.5 rounded-full ${meta.dot} opacity-20`}
                      />
                    )}
                    <span
                      className={`relative block h-3 w-3 rounded-full ring-4 ring-card ${meta.dot}`}
                    />
                  </span>
                </div>

                {/* Task card */}
                <div className="pb-4">
                  <Card className={`overflow-hidden border-l-4 ${meta.border} p-4`}>
                    {/* Time inline (mobile) */}
                    <div className="mb-2 flex items-center gap-2 sm:hidden">
                      <span className="text-numeric inline-flex items-center rounded-md bg-base-subtle px-2 py-0.5 text-xs font-semibold text-ink-soft">
                        {time ?? "Sin horario"}
                      </span>
                      {duration && (
                        <span className="text-xs font-medium text-ink-faint">
                          {duration}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-ink">
                            {taskTypeName}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chip}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </div>

                        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm">
                          <span className="font-medium text-ink">{farmName}</span>
                          <span className="text-ink-faint">·</span>
                          <span className="text-ink-soft">{lotName}</span>
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-faint">
                          <PeopleIcon className="h-3.5 w-3.5" />
                          {operatorsLabel}
                        </p>
                      </div>

                      {/* Time + duration (desktop) */}
                      <div className="hidden shrink-0 text-right sm:block">
                        <time className="text-numeric text-sm font-semibold text-ink">
                          {time ?? "Sin horario"}
                        </time>
                        {duration && (
                          <p className="mt-0.5 text-xs font-medium text-ink-faint">
                            {duration}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Nueva tarea (ADMIN) */}
      {isAdmin && (
        <Modal
          open={createOpen}
          onClose={() => {
            if (!creating) setCreateOpen(false);
          }}
          title="Nueva tarea"
          subtitle="Elegí campo, lote, labor, fecha y hora. El operario es opcional."
          widthClass="max-w-xl"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <span title={createBlockedReason}>
                <Button
                  onClick={() => void handleCreate()}
                  disabled={creating || !canCreate}
                >
                  {creating ? "Creando…" : "Crear tarea"}
                </Button>
              </span>
            </div>
          }
        >
          <div className="space-y-4">
            {createError && <Alert tone="error">{createError}</Alert>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Campo"
                value={createFarmId}
                onChange={(e) => {
                  setCreateFarmId(e.target.value);
                  setCreateLotId("");
                }}
                options={farmOptions}
                placeholder="Seleccioná un campo"
                disabled={creating || farms.length === 0}
                required
              />
              <SelectField
                label="Lote"
                value={createLotId}
                onChange={(e) => setCreateLotId(e.target.value)}
                options={lotOptions}
                placeholder={
                  createFarmId ? "Seleccioná un lote" : "Elegí un campo primero"
                }
                disabled={creating || !createFarmId || lotOptions.length === 0}
                required
                hint={
                  createFarmId && lotOptions.length === 0
                    ? "El campo elegido no tiene lotes cargados."
                    : undefined
                }
              />
            </div>

            <SelectField
              label="Labor"
              value={createTaskTypeId}
              onChange={(e) => setCreateTaskTypeId(e.target.value)}
              options={taskTypeOptions}
              placeholder="Seleccioná una labor"
              disabled={creating || taskTypes.length === 0}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Fecha"
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
                disabled={creating}
                required
              />
              <TextField
                label="Hora"
                type="time"
                value={createTime}
                onChange={(e) => setCreateTime(e.target.value)}
                disabled={creating}
              />
            </div>

            <SelectField
              label="Operario"
              value={createOperatorId}
              onChange={(e) => setCreateOperatorId(e.target.value)}
              options={operatorOptions}
              disabled={creating}
              hint="Opcional. Podés asignarlo ahora o más tarde."
            />
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function TimelineSkeleton() {
  return (
    <div className="space-y-0" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-1 sm:grid-cols-[4.5rem_1.5rem_1fr] sm:gap-x-4"
        >
          <div className="hidden pt-4 sm:block">
            <Skeleton className="ml-auto h-4 w-10" />
          </div>
          <div className="relative hidden justify-center sm:flex">
            <Skeleton className="mt-4 h-3 w-3 rounded-full" />
          </div>
          <div className="pb-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
}
