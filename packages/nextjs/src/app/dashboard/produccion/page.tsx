"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  HeroBand,
  StatusBadge,
  type StatusMap,
} from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/form";
import { ListSkeleton } from "@/components/ui/skeleton";
import { navItems } from "@/components/ui/nav";
import { ProductionIcon, RefreshIcon } from "@/components/ui/icons";
import {
  apiGet,
  type FarmDTO,
  type LotDTO,
  type TaskDTO,
  type TaskTypeDTO,
} from "@/api/client";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const timeFmt = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Local YYYY-MM-DD for "today", matching the native date input value. */
function todayKey(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Buckets an ISO timestamp into its local calendar day (YYYY-MM-DD). */
function localDayKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : timeFmt.format(d);
}

function fmtDayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return dateKey;
  const label = dayFmt.format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const TASK_STATUS_BADGE: StatusMap<TaskDTO["status"]> = {
  PENDIENTE: { label: "Pendiente", tone: "slate", dot: "bg-ink-faint" },
  EN_PROGRESO: { label: "En progreso", tone: "wheat", dot: "bg-agro-wheat" },
  FINALIZADA: { label: "Finalizada", tone: "green", dot: "bg-agro-green" },
  CANCELADA: { label: "Cancelada", tone: "earth", dot: "bg-agro-earth" },
};

type BoardTask = {
  id: string;
  taskTypeName: string;
  status: TaskDTO["status"];
  operatorsLabel: string | null;
  time: string | null;
};

type LotGroup = { lotName: string; tasks: BoardTask[] };
type FarmGroup = { farmName: string; lots: LotGroup[]; taskCount: number };

type Summary = {
  pending: number;
  inProgress: number;
  done: number;
  cancelled: number;
};

/** Resolves the operator line without inventing data. */
function describeOperators(task: TaskDTO): string | null {
  if (!Array.isArray(task.operators)) return null;
  if (task.operators.length === 0) return "Sin operarios asignados";
  const names = task.operators
    .map((operator) => operator?.name)
    .filter((name): name is string => Boolean(name && name.trim()));
  if (names.length > 0) return names.join(", ");
  return `${task.operators.length} ${
    task.operators.length === 1 ? "operario" : "operarios"
  }`;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProduccionPage() {
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [lots, setLots] = useState<LotDTO[]>([]);
  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskTypeDTO[]>([]);
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
      apiGet<TaskDTO[]>("/tasks"),
      apiGet<LotDTO[]>("/lots"),
      apiGet<FarmDTO[]>("/farms"),
      apiGet<TaskTypeDTO[]>("/task-types"),
    ])
      .then(([taskList, lotList, farmList, typeList]) => {
        if (!alive) return;
        setTasks(Array.isArray(taskList) ? taskList : []);
        setLots(Array.isArray(lotList) ? lotList : []);
        setFarms(Array.isArray(farmList) ? farmList : []);
        setTaskTypes(Array.isArray(typeList) ? typeList : []);
      })
      .catch(() => {
        if (alive) {
          setError("No se pudieron cargar las tareas y los catálogos.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [version]);

  const dayTasks = useMemo(
    () => tasks.filter((task) => localDayKey(task.startedAt) === selectedDate),
    [tasks, selectedDate],
  );

  const summary = useMemo<Summary>(() => {
    const acc: Summary = { pending: 0, inProgress: 0, done: 0, cancelled: 0 };
    dayTasks.forEach((task) => {
      if (task.status === "PENDIENTE") acc.pending += 1;
      else if (task.status === "EN_PROGRESO") acc.inProgress += 1;
      else if (task.status === "FINALIZADA") acc.done += 1;
      else acc.cancelled += 1;
    });
    return acc;
  }, [dayTasks]);

  const board = useMemo<FarmGroup[]>(() => {
    const lotById = new Map(lots.map((lot) => [lot.id, lot]));
    const farmById = new Map(farms.map((farm) => [farm.id, farm]));
    const typeById = new Map(taskTypes.map((type) => [type.id, type]));

    const farmMap = new Map<string, Map<string, BoardTask[]>>();

    dayTasks.forEach((task) => {
      const lot = lotById.get(task.lotId);
      const farmName =
        task.farmName ??
        (lot ? farmById.get(lot.farmId)?.name : undefined) ??
        "Sin campo";
      const lotName = task.lotName ?? lot?.name ?? "Sin lote";
      const taskTypeName =
        task.taskTypeName ?? typeById.get(task.taskTypeId)?.name ?? "Sin labor";

      const boardTask: BoardTask = {
        id: task.id,
        taskTypeName,
        status: task.status,
        operatorsLabel: describeOperators(task),
        time: fmtTime(task.startedAt),
      };

      let lotMap = farmMap.get(farmName);
      if (!lotMap) {
        lotMap = new Map<string, BoardTask[]>();
        farmMap.set(farmName, lotMap);
      }
      const list = lotMap.get(lotName);
      if (list) list.push(boardTask);
      else lotMap.set(lotName, [boardTask]);
    });

    const byTime = (a: BoardTask, b: BoardTask) =>
      (a.time ?? "").localeCompare(b.time ?? "");

    return Array.from(farmMap.entries())
      .map(([farmName, lotMap]) => {
        const lotGroups: LotGroup[] = Array.from(lotMap.entries())
          .map(([lotName, list]) => ({ lotName, tasks: [...list].sort(byTime) }))
          .sort((a, b) => a.lotName.localeCompare(b.lotName));
        const taskCount = lotGroups.reduce((n, group) => n + group.tasks.length, 0);
        return { farmName, lots: lotGroups, taskCount };
      })
      .sort((a, b) => a.farmName.localeCompare(b.farmName));
  }, [dayTasks, lots, farms, taskTypes]);

  return (
    <DashboardLayout
      title="Producción"
      sidebarItems={navItems}
      breadcrumb="Tablero diario de labores por campo y lote"
    >
      <HeroBand
        kicker="Tablero de tareas"
        title="Tareas del día"
        description="Tareas iniciadas en la fecha seleccionada, agrupadas por campo y lote."
        icon={<ProductionIcon className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">
              {dayTasks.length} {dayTasks.length === 1 ? "tarea" : "tareas"}
            </span>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-card-lg border border-agro-border bg-card px-5 py-4 shadow-card">
        <div className="w-full sm:w-56">
          <TextField
            label="Fecha"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="slate">{summary.pending} pendientes</Badge>
          <Badge tone="wheat">{summary.inProgress} en progreso</Badge>
          <Badge tone="green">{summary.done} finalizadas</Badge>
          <Badge tone="earth">{summary.cancelled} canceladas</Badge>
        </div>
      </div>

      {error && (
        <Alert tone="error" title="No se pudo cargar el tablero" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="secondary" onClick={refresh}>
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      {loading ? (
        <Card className="overflow-hidden">
          <ListSkeleton rows={5} />
        </Card>
      ) : error ? null : board.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ProductionIcon />}
            title={selectedDate ? "No hay tareas para esta fecha" : "Seleccioná una fecha"}
            subtitle={
              selectedDate
                ? `No se registraron tareas iniciadas el ${fmtDayLabel(selectedDate)}.`
                : "Elegí un día para ver sus tareas."
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {board.map((farm) => (
            <Card key={farm.farmName} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
                <div>
                  <h3 className="font-semibold text-ink">{farm.farmName}</h3>
                  <p className="text-sm text-ink-soft">
                    {farm.lots.length} {farm.lots.length === 1 ? "lote" : "lotes"} ·{" "}
                    {farm.taskCount} {farm.taskCount === 1 ? "tarea" : "tareas"}
                  </p>
                </div>
                <Badge tone="slate">{farm.taskCount}</Badge>
              </div>

              <div className="divide-y divide-agro-border">
                {farm.lots.map((lot) => (
                  <section key={lot.lotName} className="px-5 py-4">
                    <div className="mb-2 flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-ink">{lot.lotName}</h4>
                      <span className="text-xs font-medium text-ink-faint">
                        {lot.tasks.length}
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {lot.tasks.map((task) => (
                        <li
                          key={task.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-agro-border bg-base-subtle/30 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                              {task.taskTypeName}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-soft">
                              {task.time ? `${task.time} h` : "Sin horario"}
                              {task.operatorsLabel
                                ? ` · ${task.operatorsLabel}`
                                : ""}
                            </p>
                          </div>
                          <StatusBadge status={task.status} map={TASK_STATUS_BADGE} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
