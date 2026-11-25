"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { ArrowRightIcon, CheckIcon, ProductionIcon, XIcon } from "@/components/ui/icons";
import type { ReapplicationAlertDTO, TaskDTO } from "@/api/client";

type TaskStatus = TaskDTO["status"];

const STATUS_META: Record<
  TaskStatus,
  {
    label: string;
    badgeTone: "green" | "wheat" | "slate" | "earth";
    totemClass: string;
    cardTopClass: string;
    stemClass: string;
  }
> = {
  FINALIZADA: {
    label: "Finalizada",
    badgeTone: "green",
    totemClass: "border-agro-green bg-agro-green text-white shadow-sm",
    cardTopClass: "border-t-agro-green",
    stemClass: "bg-agro-green/50",
  },
  EN_PROGRESO: {
    label: "En curso",
    badgeTone: "wheat",
    totemClass: "border-agro-ochre bg-agro-ochre/20 text-agro-wheat-dark",
    cardTopClass: "border-t-agro-ochre",
    stemClass: "bg-agro-ochre/60",
  },
  PENDIENTE: {
    label: "Pendiente",
    badgeTone: "slate",
    totemClass: "border-ink bg-card text-ink",
    cardTopClass: "border-t-ink",
    stemClass: "bg-agro-border-strong",
  },
  CANCELADA: {
    label: "Cancelada",
    badgeTone: "earth",
    totemClass: "border-dashed border-agro-earth bg-base-subtle text-agro-earth-dark",
    cardTopClass: "border-t-agro-earth/70 opacity-75",
    stemClass: "bg-agro-earth/40",
  },
};

const todayHeaderFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFmt = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
});

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** True when the task is scheduled or finished on the current local calendar day. */
export function isTaskForToday(task: TaskDTO, now = new Date()): boolean {
  const raw = task.startedAt ?? task.finishedAt;
  if (!raw) return false;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return false;
  return localDayKey(parsed) === localDayKey(now);
}

/**
 * Checks whether a re-application alert already has a follow-up task created
 * after the originating recipe date so resolved alerts do not keep nagging.
 */
export function hasFollowUpTaskForAlert(
  alert: ReapplicationAlertDTO,
  tasks: TaskDTO[],
): boolean {
  const recipeTime = new Date(alert.recipeDate).getTime();
  if (Number.isNaN(recipeTime)) return false;

  return tasks.some((task) => {
    if (task.id === alert.taskId) return false;
    if (task.lotId !== alert.lotId) return false;
    if (task.status === "CANCELADA") return false;
    if (alert.laborTypeId && task.laborTypeId !== alert.laborTypeId) return false;
    if (!task.startedAt) return false;
    const taskTime = new Date(task.startedAt).getTime();
    return !Number.isNaN(taskTime) && taskTime > recipeTime;
  });
}

function formatTaskTime(task: TaskDTO): string {
  const raw = task.startedAt ?? task.finishedAt;
  if (!raw) return "Sin hora";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "Sin hora";
  return timeFmt.format(d);
}

function formatTaskDayHint(task: TaskDTO): string | null {
  const raw = task.startedAt ?? task.finishedAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return shortDateFmt.format(d);
}

function sortTimelineTasks(list: TaskDTO[]): TaskDTO[] {
  return [...list].sort((a, b) => {
    const at = a.startedAt ? new Date(a.startedAt).getTime() : Number.POSITIVE_INFINITY;
    const bt = b.startedAt ? new Date(b.startedAt).getTime() : Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    return a.id.localeCompare(b.id);
  });
}

function TimelineSkeleton() {
  return (
    <div className="px-5 py-6" aria-hidden="true">
      <div className="relative flex gap-4 overflow-hidden">
        <div className="absolute left-0 right-0 top-10 h-0.5 bg-agro-border" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex w-56 shrink-0 flex-col items-center">
            <div className="skeleton mb-2 h-3.5 w-12" />
            <div className="skeleton z-10 h-9 w-9 rounded-full" />
            <div className="h-4 w-px bg-agro-border" />
            <div className="skeleton h-28 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyTasksTimeline({
  tasks,
  loading,
}: {
  tasks: TaskDTO[];
  loading: boolean;
}) {
  const [viewMode, setViewMode] = useState<"today" | "active">("today");

  const todayTasks = useMemo(
    () => sortTimelineTasks(tasks.filter((t) => isTaskForToday(t))),
    [tasks],
  );

  const activeTasks = useMemo(
    () =>
      sortTimelineTasks(
        tasks.filter((t) => t.status === "PENDIENTE" || t.status === "EN_PROGRESO"),
      ),
    [tasks],
  );

  const displayedTasks = viewMode === "today" ? todayTasks : activeTasks;
  const completedCount = displayedTasks.filter((t) => t.status === "FINALIZADA").length;
  const totalCount = displayedTasks.length;
  const completionPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const leadingCompletedCount = useMemo(() => {
    let count = 0;
    for (const task of displayedTasks) {
      if (task.status === "FINALIZADA") count += 1;
      else break;
    }
    return count;
  }, [displayedTasks]);

  const completedTrackPct =
    totalCount > 1 && leadingCompletedCount > 0
      ? Math.min(100, Math.round((leadingCompletedCount / totalCount) * 100))
      : totalCount === 1 && leadingCompletedCount === 1
        ? 100
        : 0;

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-semibold text-ink">Actividades del día</h3>
            <span className="op-caption capitalize">
              {todayHeaderFmt.format(new Date())}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            {loading
              ? "Cargando programación de labores…"
              : totalCount > 0
                ? `${completedCount} de ${totalCount} ${
                    totalCount === 1 ? "labor finalizada" : "labores finalizadas"
                  }`
                : viewMode === "today"
                  ? "No hay labores programadas para hoy."
                  : "No hay labores pendientes ni en curso."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-agro-border bg-base-subtle p-0.5"
            role="group"
            aria-label="Filtro de línea de tiempo"
          >
            <button
              type="button"
              onClick={() => setViewMode("today")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === "today"
                  ? "bg-card text-ink shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Hoy <span className="op-num ml-0.5">({todayTasks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("active")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === "active"
                  ? "bg-card text-ink shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Activas <span className="op-num ml-0.5">({activeTasks.length})</span>
            </button>
          </div>

          <Link href="/dashboard/produccion" className="op-btn op-btn--quiet">
            Ir a Producción <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {!loading && totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border bg-base-subtle/35 px-5 py-2.5">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-soft">
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-agro-green" aria-hidden="true" />
              Finalizada
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-agro-ochre" aria-hidden="true" />
              En curso
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-card"
                aria-hidden="true"
              />
              Pendiente
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full border border-dashed border-agro-earth bg-base-subtle"
                aria-hidden="true"
              />
              Cancelada
            </li>
          </ul>

          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-agro-border">
              <div
                className="h-full rounded-full bg-agro-green transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="op-num text-xs font-semibold text-ink">
              {completionPct}%
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <TimelineSkeleton />
      ) : displayedTasks.length === 0 ? (
        <div className="pb-6">
          <EmptyState
            icon={<ProductionIcon />}
            title={
              viewMode === "today"
                ? "Sin tareas programadas para hoy"
                : "Sin tareas pendientes o en curso"
            }
            subtitle={
              viewMode === "today" && activeTasks.length > 0
                ? `Tenés ${activeTasks.length} ${
                    activeTasks.length === 1 ? "labor activa" : "labores activas"
                  } de otros días. Cambiá a "Activas" para verlas en la línea de tiempo.`
                : "Creá o reprogramá una labor desde Producción para seguir el avance del día acá."
            }
          />
          <div className="flex flex-wrap justify-center gap-2 px-6">
            {viewMode === "today" && activeTasks.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode("active")}
                className="op-btn"
              >
                Ver labores activas ({activeTasks.length})
              </button>
            )}
            <Link href="/dashboard/produccion" className="op-btn op-btn--primary">
              Planificar en Producción
            </Link>
          </div>
        </div>
      ) : (
        <div className="op-timeline-scroll overflow-x-auto px-5 py-6">
          <div className="relative inline-flex min-w-full items-start gap-4">
            {/* Horizontal track running behind every totem */}
            <div
              className="pointer-events-none absolute left-10 right-10 top-[2.55rem] h-0.5 bg-agro-border"
              aria-hidden="true"
            >
              {completedTrackPct > 0 && (
                <div
                  className="h-full bg-agro-green transition-all duration-300"
                  style={{ width: `${completedTrackPct}%` }}
                />
              )}
            </div>

            {displayedTasks.map((task) => {
              const meta = STATUS_META[task.status] ?? STATUS_META.PENDIENTE;
              const operators =
                task.operators && task.operators.length > 0
                  ? task.operators
                      .map((op) => op.name?.trim())
                      .filter(Boolean)
                      .join(", ")
                  : null;
              const dayHint =
                viewMode === "active" ? formatTaskDayHint(task) : null;

              return (
                <div
                  key={task.id}
                  className="relative flex w-56 shrink-0 flex-col items-center"
                >
                  {/* Timestamp above the totem */}
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="op-num text-xs font-semibold text-ink">
                      {formatTaskTime(task)}
                    </span>
                    {dayHint && (
                      <span className="op-caption op-num">· {dayHint}</span>
                    )}
                  </div>

                  {/* Totem */}
                  <div
                    className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 ${meta.totemClass}`}
                    title={meta.label}
                  >
                    {task.status === "EN_PROGRESO" && (
                      <span
                        className="absolute inset-0 rounded-full bg-agro-ochre/35 motion-safe:animate-ping"
                        aria-hidden="true"
                      />
                    )}
                    {task.status === "FINALIZADA" ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : task.status === "CANCELADA" ? (
                      <XIcon className="h-4 w-4" />
                    ) : task.status === "EN_PROGRESO" ? (
                      <span className="relative h-3 w-3 rounded-full bg-agro-ochre" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-ink" />
                    )}
                  </div>

                  {/* Stem */}
                  <div
                    className={`h-4 w-px ${meta.stemClass}`}
                    aria-hidden="true"
                  />

                  {/* Task card */}
                  <div
                    className={`w-full rounded-lg border border-agro-border border-t-[3px] bg-card p-3 shadow-xs transition-colors hover:bg-base-subtle/40 ${meta.cardTopClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">
                        {task.laborTypeName ?? "Labor"}
                      </p>
                      <Badge tone={meta.badgeTone}>{meta.label}</Badge>
                    </div>

                    <p className="mt-1 truncate text-xs text-ink-soft">
                      <span className="font-medium text-ink">
                        {task.farmName ?? "Campo"}
                      </span>
                      {" · "}
                      {task.lotName ?? "Lote"}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-agro-border pt-2 text-[11px]">
                      <span
                        className={`truncate ${
                          operators ? "font-medium text-ink-soft" : "text-ink-faint"
                        }`}
                      >
                        {operators ?? "Sin operario"}
                      </span>

                      {task.prescriptionStatus === "SIN_RECETA" && (
                        <Link
                          href="/dashboard/recetas"
                          className="shrink-0 font-semibold text-agro-wheat-text underline-offset-2 hover:underline"
                        >
                          Sin receta
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
