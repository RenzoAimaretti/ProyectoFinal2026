"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardIcon, RefreshIcon } from "@/components/ui/icons";
import { navItems, notifyPrescriptionInboxChanged } from "@/components/ui/nav";
import {
  PrescriptionEditor,
  type EditorContext,
} from "@/components/recetas/prescription-editor";
import {
  ApiError,
  listPendingPrescriptions,
  type PendingPrescriptionTaskDTO,
  type TaskDTO,
} from "@/api/client";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type TaskStatus = TaskDTO["status"];

/** Operate legend status driving the swatch (mirrors the Producción page). */
type OpStatus = "pendiente" | "aprobado" | "rechazado" | "vacio";

type StatusMeta = {
  label: string;
  dataStatus: OpStatus;
  pulse: boolean;
};

const STATUS_META: Record<TaskStatus, StatusMeta> = {
  PENDIENTE: { label: "No iniciada", dataStatus: "vacio", pulse: false },
  EN_PROGRESO: { label: "En progreso", dataStatus: "pendiente", pulse: true },
  FINALIZADA: { label: "Finalizada", dataStatus: "aprobado", pulse: false },
  CANCELADA: { label: "Cancelada", dataStatus: "rechazado", pulse: false },
};

const dateTimeFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Local date + time of a task start, or an honest "no start recorded". */
function fmtStartedAt(iso: string | null): string {
  if (!iso) return "Sin inicio registrado";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sin inicio registrado";
  return dateTimeFmt.format(d);
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | string | null;
    const apiMessage =
      body && typeof body === "object" && typeof body.message === "string"
        ? body.message
        : null;
    if (err.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    if (err.status === 403)
      return "Tu rol no tiene permiso para ver las recetas pendientes.";
    if (err.status >= 500)
      return apiMessage ?? "El servidor no pudo responder. Intentá nuevamente.";
    return apiMessage ?? `No se pudieron cargar las recetas pendientes (código ${err.status}).`;
  }
  return "No se pudieron cargar las recetas pendientes. Revisá tu conexión e intentá nuevamente.";
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RecetasPage() {
  const [tasks, setTasks] = useState<PendingPrescriptionTaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [editorContext, setEditorContext] = useState<EditorContext | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setVersion((v) => v + 1);
  }, []);

  /** CLOSE AND REFRESH after a prescription is written. */
  const handleSaved = useCallback(() => {
    setEditorContext(null);
    refresh();
    // The task left SIN_RECETA: tell the shell so the sidebar counter updates.
    notifyPrescriptionInboxChanged();
  }, [refresh]);

  const openEditor = useCallback((task: PendingPrescriptionTaskDTO) => {
    setEditorContext({
      taskId: task.id,
      taskTypeName: task.taskTypeName,
      farmName: task.farmName,
      lotName: task.lotName,
      lotArea: typeof task.lotArea === "number" ? task.lotArea : null,
      status: task.status,
      startedAt: task.startedAt,
    });
  }, []);

  useEffect(() => {
    let alive = true;
    listPendingPrescriptions()
      .then((list) => {
        if (alive) setTasks(Array.isArray(list) ? list : []);
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

  /** Oldest start first; rows without a start go last. */
  const rows = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const at = a.startedAt ? new Date(a.startedAt).getTime() : Number.POSITIVE_INFINITY;
        const bt = b.startedAt ? new Date(b.startedAt).getTime() : Number.POSITIVE_INFINITY;
        return at - bt;
      }),
    [tasks],
  );

  return (
    <DashboardLayout
      title="Recetas"
      sidebarItems={navItems}
      breadcrumb="Actividades que esperan su receta fitosanitaria"
    >
      {/* Command header */}
      <section className="op-plate mb-5 flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="op-label">Bandeja del ingeniero agrónomo</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            Recetas pendientes
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Actividades que requieren receta fitosanitaria y todavía no la tienen. Ordenadas por
            inicio, de la más antigua a la más reciente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            {loading ? (
              <div className="skeleton ml-auto h-8 w-14" aria-hidden="true" />
            ) : (
              <p className="op-num text-3xl font-bold leading-none text-ink">{rows.length}</p>
            )}
            <p className="op-label mt-1">Pendientes</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="op-btn"
            aria-busy={loading}
          >
            <RefreshIcon className="h-4 w-4" />
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </section>

      {error && (
        <Alert tone="error" title="No se pudo cargar la bandeja de recetas" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={refresh} className="op-btn op-btn--quiet">
              Reintentar
            </button>
          </div>
        </Alert>
      )}

      {loading ? (
        <QueueSkeleton />
      ) : error ? null : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardIcon />}
            title="Nada pendiente"
            subtitle="No hay actividades esperando una receta fitosanitaria."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {rows.map((task) => {
              const meta = STATUS_META[task.status] ?? STATUS_META.PENDIENTE;
              return (
                <li key={task.id} className="op-queue-row px-4 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="op-swatch"
                          data-status={meta.dataStatus}
                          aria-hidden="true"
                        />
                        <p className="truncate text-sm font-semibold text-ink">
                          {task.taskTypeName}
                        </p>
                        <span className="op-label">{meta.label}</span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm">
                        <span className="font-medium text-ink">{task.farmName}</span>
                        <span className="text-ink-faint">·</span>
                        <span className="text-ink-soft">{task.lotName}</span>
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        Inicio:{" "}
                        <span className="op-num">{fmtStartedAt(task.startedAt)}</span>
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge tone="wheat">Sin receta</Badge>
                      <button
                        type="button"
                        className="op-btn op-btn--primary"
                        onClick={() => openEditor(task)}
                      >
                        Escribir receta
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {editorContext && (
        <PrescriptionEditor
          key={editorContext.taskId}
          mode="create"
          context={editorContext}
          onClose={() => setEditorContext(null)}
          onSaved={handleSaved}
        />
      )}
    </DashboardLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function QueueSkeleton() {
  return (
    <Card className="overflow-hidden" >
      <ul aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-4 border-b border-agro-border px-4 py-4 last:border-b-0"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-28" />
          </li>
        ))}
      </ul>
    </Card>
  );
}
