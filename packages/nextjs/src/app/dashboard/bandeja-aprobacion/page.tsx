"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  IconTile,
  PageHeader,
  StatusBadge,
  TabButton,
  type Tone,
} from "@/components/ui/primitives";
import { isClientRole, navItems } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import {
  ApiError,
  approveDailyReport,
  getDailyReport,
  listDailyReportPhotos,
  listDailyReports,
  rejectDailyReport,
  type DailyReportDTO,
  type DailyReportStatus,
  type PhotoDTO,
} from "@/api/client";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type StatusFilter = DailyReportStatus | "TODOS";

const TABS: { id: StatusFilter; label: string }[] = [
  { id: "PENDIENTE_APROBACION", label: "Pendientes" },
  { id: "APROBADO", label: "Aprobados" },
  { id: "RECHAZADO", label: "Rechazados" },
  { id: "TODOS", label: "Todos" },
];

const rowTone: Record<DailyReportStatus, Tone> = {
  PENDIENTE_APROBACION: "wheat",
  APROBADO: "green",
  RECHAZADO: "earth",
};

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : dateFmt.format(d);
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : dateTimeFmt.format(d);
}

function fmtNumber(value: number | null | undefined): string {
  return typeof value === "number" ? value.toLocaleString("es-AR") : "—";
}

type ActionFeedback = { message: string; refresh: boolean };

function describeError(err: unknown): ActionFeedback {
  if (err instanceof ApiError) {
    if (err.code === "INSUFFICIENT_STOCK") {
      const body = (err.body ?? null) as {
        message?: string;
        required?: number;
        available?: number;
      } | null;
      const detail =
        body && typeof body.required === "number" && typeof body.available === "number"
          ? `se requieren ${fmtNumber(body.required)} y hay ${fmtNumber(body.available)} disponibles.`
          : body?.message ?? "el stock del cliente no alcanza para aprobar este parte.";
      return { message: `Stock insuficiente: ${detail}`, refresh: false };
    }
    if (err.status === 409) {
      return { message: "El parte ya fue resuelto por otra persona.", refresh: true };
    }
    if (err.status === 404) {
      return { message: "El parte ya no existe o fue eliminado.", refresh: true };
    }
    if (err.status === 401) {
      return { message: "Tu sesión expiró. Volvé a iniciar sesión.", refresh: false };
    }
    return { message: `No se pudo completar la acción (código ${err.status}).`, refresh: false };
  }
  return { message: "Ocurrió un error inesperado. Intentá nuevamente.", refresh: false };
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function CameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function WarningIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 3h6m2.25-9.75h.008v.008h-.008V5.25zm0 0H15a3 3 0 01-3 3H9a3 3 0 01-3-3H4.5A2.25 2.25 0 002.25 7.5v10.5A2.25 2.25 0 004.5 20.25h15a2.25 2.25 0 002.25-2.25V7.5A2.25 2.25 0 0019.5 5.25h-1.5z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Notebook viewer (master-detail content)                             */
/* ------------------------------------------------------------------ */

function NotebookRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">{value || "—"}</p>
    </div>
  );
}

function PhotoStrip({ photos }: { photos: PhotoDTO[] }) {
  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<CameraIcon />}
        title="Sin fotos adjuntas"
        subtitle="La carga de fotos desde el móvil todavía no sincroniza"
      />
    );
  }

  const ordered = [...photos].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {ordered.map((p, idx) => {
        const isUrl = /^https?:\/\//i.test(p.localPath);
        if (isUrl) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.localPath}
              alt={`Foto ${idx + 1} del parte`}
              className="h-28 w-40 shrink-0 rounded-lg border border-agro-border object-cover"
            />
          );
        }
        const fileName = p.localPath.split(/[\\/]/).pop() || p.localPath;
        return (
          <div
            key={p.id}
            title={p.localPath}
            className="flex h-28 w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-agro-border bg-base-subtle/40 p-3 text-center"
          >
            <span className="text-ink-faint">
              <CameraIcon />
            </span>
            <span className="w-full truncate text-[11px] font-medium text-ink-soft">{fileName}</span>
          </div>
        );
      })}
    </div>
  );
}

function DailyReportNotebook({
  report,
  photos,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
  pending,
  actionError,
}: {
  report: DailyReportDTO;
  photos: PhotoDTO[];
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  pending: "approve" | "reject" | null;
  actionError: string | null;
}) {
  return (
    <div>
      {/* Notebook header */}
      <div className="paper-page border-b border-agro-border px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
              Parte de trabajo · cuaderno digital
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-ink">{report.taskTypeName}</h3>
            <p className="text-sm text-ink-soft">
              {report.farmName} · {report.lotName} · {report.clientName}
            </p>
          </div>
          <StatusBadge status={report.status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <NotebookRow label="Fecha" value={fmtDate(report.date)} />
          <NotebookRow label="Firma / Cliente" value={report.clientName} />
          <NotebookRow label="Campo / Lote" value={`${report.farmName} · ${report.lotName}`} />
          <NotebookRow label="Labor" value={report.taskTypeName} />
          <NotebookRow label="Operario" value={report.operatorName} />
          <NotebookRow label="Empresa" value={report.companyName} />
        </div>
      </div>

      {/* Work amounts */}
      <div className="grid grid-cols-2 gap-4 border-b border-agro-border px-6 py-5">
        <div className="rounded-card-lg border border-agro-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Hectáreas trabajadas
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink">
            {fmtNumber(report.hectares)}
            <span className="ml-1 text-sm font-semibold text-ink-faint">ha</span>
          </p>
        </div>
        <div className="rounded-card-lg border border-agro-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Horas de labor
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink">
            {fmtNumber(report.hours)}
            <span className="ml-1 text-sm font-semibold text-ink-faint">hs</span>
          </p>
        </div>
      </div>

      {/* Inputs table */}
      <section className="border-b border-agro-border px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink">Insumos aplicados</h4>
          <Badge tone="slate">{report.items.length}</Badge>
        </div>
        {report.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-agro-border px-3 py-4 text-center text-sm text-ink-soft">
            Sin insumos registrados.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-agro-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-base-subtle/60 text-[11px] uppercase tracking-wider text-ink-faint">
                <tr>
                  <th className="px-3 py-2 font-semibold">Insumo</th>
                  <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                  <th className="px-3 py-2 font-semibold">Unidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-agro-border">
                {report.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-medium text-ink">{item.inputName}</td>
                    <td className="px-3 py-2 text-right text-ink">{fmtNumber(item.quantity)}</td>
                    <td className="px-3 py-2 text-ink-soft">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Photos */}
      <section className="border-b border-agro-border px-6 py-5">
        <h4 className="text-sm font-semibold text-ink">Fotos del parte</h4>
        <div className="mt-3">
          <PhotoStrip photos={photos} />
        </div>
      </section>

      {/* Resolution state */}
      {report.status === "RECHAZADO" && (
        <div className="border-b border-agro-border bg-agro-earth/10 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-agro-earth-dark">
            Parte rechazado
          </p>
          {report.rejectionReason && <p className="mt-1 text-sm text-ink">{report.rejectionReason}</p>}
        </div>
      )}

      {report.status === "APROBADO" && (
        <div className="border-b border-agro-border bg-agro-green/10 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-agro-green-dark">
            Parte aprobado
          </p>
          <p className="mt-1 text-sm text-ink">
            {report.approvedByName ? `Por ${report.approvedByName}` : "Aprobado"}
            {report.approvedAt ? ` · ${fmtDateTime(report.approvedAt)}` : ""}
          </p>
        </div>
      )}

      {/* Actions */}
      {report.status === "PENDIENTE_APROBACION" && (
        <section className="px-6 py-5">
          <h4 className="text-sm font-semibold text-ink">Resolver parte</h4>
          <p className="mt-1 text-sm text-ink-soft">
            Aprobá el parte o rechazalo indicando un motivo.
          </p>

          {actionError && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-lg border border-agro-earth/40 bg-agro-earth/10 px-3 py-2.5 text-sm text-agro-earth-dark"
            >
              <span className="mt-0.5 shrink-0">
                <WarningIcon />
              </span>
              <span>{actionError}</span>
            </div>
          )}

          <label htmlFor="reject-reason" className="mt-4 block text-xs font-semibold text-ink-faint">
            Motivo de rechazo
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Ej: las hectáreas no coinciden con la orden de trabajo"
            disabled={pending !== null}
            className="mt-1.5 w-full resize-none rounded-lg border border-agro-border bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-agro-green/40 disabled:opacity-60"
          />

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="danger" onClick={onReject} disabled={pending !== null}>
              {pending === "reject" ? "Rechazando…" : "Rechazar"}
            </Button>
            <Button variant="primary" onClick={onApprove} disabled={pending !== null}>
              {pending === "approve" ? "Aprobando…" : "Aprobar"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="skeleton h-6 w-1/3" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-40 w-full" />
      <div className="skeleton h-28 w-full" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-agro-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="skeleton h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-3 w-1/4" />
          </div>
          <div className="skeleton h-6 w-20 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BandejaAprobacionPage() {
  const { user } = useAuth();
  const esAdmin = !isClientRole(user?.role);

  const [reports, setReports] = useState<DailyReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDIENTE_APROBACION");
  const [dateFilter, setDateFilter] = useState("");
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DailyReportDTO | null>(null);
  const [photos, setPhotos] = useState<PhotoDTO[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReports(await listDailyReports());
    } catch (err) {
      setLoadError(describeError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load. State is only written after the await, so the effect does
    // not trigger synchronous cascading renders.
    let alive = true;
    (async () => {
      try {
        const data = await listDailyReports();
        if (alive) setReports(data);
      } catch (err) {
        if (alive) setLoadError(describeError(err).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const openReport = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await getDailyReport(id));
    } catch (err) {
      setDetailError(describeError(err).message);
    } finally {
      setDetailLoading(false);
    }
    try {
      setPhotos(await listDailyReportPhotos(id));
    } catch {
      setPhotos([]);
    }
  }, []);

  const refreshAfterAction = useCallback(
    async (id: string) => {
      try {
        setReports(await listDailyReports());
      } catch {
        // Keep the current list; the detail refresh below is the priority.
      }
      await openReport(id);
    },
    [openReport],
  );

  const handleRowClick = useCallback(
    (id: string) => {
      setActionError(null);
      setRejectReason("");
      void openReport(id);
    },
    [openReport],
  );

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setPhotos([]);
    setDetailError(null);
    setActionError(null);
    setRejectReason("");
    setPending(null);
  }, []);

  const performApprove = useCallback(async () => {
    if (!detail || pending) return;
    setPending("approve");
    setActionError(null);
    try {
      await approveDailyReport(detail.id);
      await refreshAfterAction(detail.id);
    } catch (err) {
      const feedback = describeError(err);
      setActionError(feedback.message);
      if (feedback.refresh) await refreshAfterAction(detail.id);
    } finally {
      setPending(null);
    }
  }, [detail, pending, refreshAfterAction]);

  const performReject = useCallback(async () => {
    if (!detail || pending) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError("Ingresá un motivo para rechazar el parte.");
      return;
    }
    setPending("reject");
    setActionError(null);
    try {
      await rejectDailyReport(detail.id, reason);
      setRejectReason("");
      await refreshAfterAction(detail.id);
    } catch (err) {
      const feedback = describeError(err);
      setActionError(feedback.message);
      if (feedback.refresh) await refreshAfterAction(detail.id);
    } finally {
      setPending(null);
    }
  }, [detail, pending, rejectReason, refreshAfterAction]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (dateFilter && (r.date ?? "").slice(0, 10) !== dateFilter) return false;
      if (!q) return true;
      const haystack = [
        r.operatorName,
        r.farmName,
        r.lotName,
        r.taskTypeName,
        r.clientName,
        r.companyName,
        ...(r.items ?? []).map((i) => i.inputName),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [reports, dateFilter, query]);

  const counts = useMemo(() => {
    const base: Record<DailyReportStatus, number> = {
      PENDIENTE_APROBACION: 0,
      APROBADO: 0,
      RECHAZADO: 0,
    };
    for (const r of searched) base[r.status] += 1;
    return base;
  }, [searched]);

  const visible = useMemo(
    () => (statusFilter === "TODOS" ? searched : searched.filter((r) => r.status === statusFilter)),
    [searched, statusFilter],
  );

  const tabCount = (id: StatusFilter): number =>
    id === "TODOS" ? searched.length : counts[id];

  const emptyTitle =
    reports.length === 0 ? "Todavía no hay partes de trabajo" : "Sin resultados para estos filtros";
  const emptySubtitle =
    reports.length === 0
      ? "Los partes cargados desde el móvil aparecerán acá para su aprobación."
      : "Probá cambiar el estado, la fecha o el texto de búsqueda.";

  return (
    <DashboardLayout
      title="Bandeja de Aprobación"
      sidebarItems={navItems}
      breadcrumb="Revisión y aprobación de partes de trabajo"
    >
      <PageHeader
        title="Bandeja de Aprobación"
        subtitle="Partes de labor cargados desde el móvil, listos para revisar y resolver."
      />

      {/* Filters */}
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg bg-base-subtle p-1 ring-1 ring-inset ring-agro-border">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                active={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    statusFilter === tab.id
                      ? "bg-agro-green text-white"
                      : "bg-card text-ink-faint ring-1 ring-inset ring-agro-border"
                  }`}
                >
                  {tabCount(tab.id)}
                </span>
              </TabButton>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filtrar por fecha"
              className="rounded-lg border border-agro-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-agro-green/40"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar operario, lote, labor…"
              aria-label="Buscar partes"
              className="w-56 rounded-lg border border-agro-border bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-agro-green/40"
            />
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? "Actualizando…" : "Actualizar"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Reports list */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
          <div>
            <h3 className="font-semibold text-ink">Partes de trabajo</h3>
            <p className="text-sm text-ink-soft">
              {visible.length} {visible.length === 1 ? "parte" : "partes"} en esta vista
            </p>
          </div>
          <Badge tone={counts.PENDIENTE_APROBACION > 0 ? "wheat" : "green"}>
            {counts.PENDIENTE_APROBACION} pendientes
          </Badge>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : loadError ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="text-agro-earth-dark">
              <WarningIcon className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-agro-earth-dark">{loadError}</p>
            <Button variant="secondary" onClick={() => void load()}>
              Reintentar
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={<InboxIcon />} title={emptyTitle} subtitle={emptySubtitle} />
        ) : (
          <ul className="divide-y divide-agro-border">
            {visible.map((r) => (
              <li key={r.id} className="stagger-item">
                <button
                  type="button"
                  onClick={() => handleRowClick(r.id)}
                  className="grid w-full grid-cols-12 items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-base-subtle"
                >
                  <div className="col-span-12 flex items-center gap-3 md:col-span-4">
                    <IconTile tone={rowTone[r.status]} className="h-10 w-10">
                      <ClipboardIcon />
                    </IconTile>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{r.taskTypeName}</p>
                      <p className="truncate text-xs text-ink-faint">{r.operatorName}</p>
                    </div>
                  </div>

                  <div className="col-span-6 md:col-span-3">
                    <p className="truncate text-sm text-ink">{r.farmName}</p>
                    <p className="truncate text-xs text-ink-faint">{r.lotName}</p>
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <p className="text-sm text-ink">{fmtDate(r.date)}</p>
                    <p className="text-xs text-ink-faint">
                      {fmtNumber(r.hectares)} ha · {fmtNumber(r.hours)} hs
                    </p>
                  </div>

                  <div className="col-span-12 flex items-center justify-between gap-2 md:col-span-3 md:justify-end">
                    {esAdmin && (
                      <span className="truncate text-xs text-ink-faint">{r.clientName}</span>
                    )}
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Master-detail: notebook viewer */}
      <Drawer
        open={Boolean(selectedId)}
        onClose={closeDrawer}
        title={detail ? detail.taskTypeName : "Parte de trabajo"}
        subtitle={detail ? `${detail.farmName} · ${detail.lotName}` : "Cargando parte…"}
        widthClass="max-w-3xl"
      >
        {detailLoading ? (
          <DetailSkeleton />
        ) : detailError && !detail ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="text-agro-earth-dark">
              <WarningIcon className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-agro-earth-dark">{detailError}</p>
            {selectedId && (
              <Button variant="secondary" onClick={() => void openReport(selectedId)}>
                Reintentar
              </Button>
            )}
          </div>
        ) : detail ? (
          <DailyReportNotebook
            report={detail}
            photos={photos}
            rejectReason={rejectReason}
            onRejectReasonChange={setRejectReason}
            onApprove={() => void performApprove()}
            onReject={() => void performReject()}
            pending={pending}
            actionError={actionError}
          />
        ) : null}
      </Drawer>
    </DashboardLayout>
  );
}
