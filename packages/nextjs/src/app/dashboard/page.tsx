"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  StatRow,
  type KpiDeltaDirection,
} from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { DataTable, type DataTableColumn } from "@/components/ui/table";
import { isApproverRole, isClientRole, navItems } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertIcon,
  ArrowRightIcon,
  FieldIcon,
  InboxIcon,
  InputsIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import {
  BarChart,
  Donut,
  TrendChart,
  type ChartSeries,
  type Segment,
} from "@/components/ui/charts";
import {
  ApiError,
  approveDailyReport,
  getStoredUser,
  listClients,
  listDailyReports,
  listReceptions,
  listStock,
  rejectDailyReport,
  rejectReception,
  validateReception,
  RECEPTION_STATUS_LABELS,
  type ClientDTO,
  type DailyReportDTO,
  type ReceptionDTO,
  type StockDTO,
} from "@/api/client";

/* ------------------------------------------------------------------ */
/* Formatting + date helpers (real data, no invented metrics)          */
/* ------------------------------------------------------------------ */

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const numberFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(value: string): string {
  const d = parseLocalDate(value);
  return d ? dateFmt.format(d) : value.slice(0, 10);
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function toDayKey(value: string): string | null {
  const d = parseLocalDate(value);
  return d ? dayKey(d) : null;
}

function lastNDays(count: number): { key: string; label: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({
      key: dayKey(d),
      label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return out;
}

function startOfWeek(): number {
  const d = new Date();
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - mondayOffset);
  return d.getTime();
}

function deltaMeta(current: number, previous: number): { text: string; direction: KpiDeltaDirection } {
  if (previous <= 0) return { text: "Primera semana con datos", direction: "flat" };
  const pct = Math.round(((current - previous) / previous) * 100);
  const direction: KpiDeltaDirection = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return { text: `${pct > 0 ? "+" : ""}${pct}% vs semana anterior`, direction };
}

/* ------------------------------------------------------------------ */
/* Action error copy (mirrors the approval inbox)                      */
/* ------------------------------------------------------------------ */

type ActionFeedback = { message: string; refresh: boolean };

function describeError(err: unknown, subject: string): ActionFeedback {
  if (err instanceof ApiError) {
    if (err.code === "INSUFFICIENT_STOCK") {
      const body = (err.body ?? null) as {
        message?: string;
        required?: number;
        available?: number;
      } | null;
      const detail =
        body && typeof body.required === "number" && typeof body.available === "number"
          ? `se requieren ${numberFmt.format(body.required)} y hay ${numberFmt.format(body.available)} disponibles.`
          : body?.message ?? "el stock del cliente no alcanza para aprobar este parte.";
      return { message: `Stock insuficiente: ${detail}`, refresh: false };
    }
    if (err.status === 409) {
      return { message: `El ${subject} ya fue resuelto por otra persona.`, refresh: true };
    }
    if (err.status === 404) {
      return { message: `El ${subject} ya no existe o fue eliminado.`, refresh: true };
    }
    if (err.status === 401) {
      return { message: "Tu sesión expiró. Volvé a iniciar sesión.", refresh: false };
    }
    if (err.status === 403) {
      return { message: "Tu rol no tiene permiso para resolver esta acción.", refresh: false };
    }
    return { message: `No se pudo completar la acción (código ${err.status}).`, refresh: false };
  }
  return { message: "Ocurrió un error inesperado. Intentá nuevamente.", refresh: false };
}

/* ------------------------------------------------------------------ */
/* Signature move: lot / parcel plan model                             */
/* ------------------------------------------------------------------ */

type PlanStatus = "pendiente" | "aprobado" | "rechazado" | "vacio";

type LotPlanEntry = {
  id: string;
  lotName: string;
  farmName: string;
  status: PlanStatus;
  count: number;
};

type ClientPlanEntry = {
  id: string;
  name: string;
  status: PlanStatus;
  count: number;
};

const PLAN_LEGEND: { status: PlanStatus; label: string }[] = [
  { status: "pendiente", label: "Pendiente" },
  { status: "aprobado", label: "Resuelto" },
  { status: "rechazado", label: "Rechazado" },
  { status: "vacio", label: "Sin registros" },
];

function dominantStatus(pending: number, resolved: number, rejected: number): PlanStatus {
  if (pending > 0) return "pendiente";
  if (resolved > 0) return "aprobado";
  if (rejected > 0) return "rechazado";
  return "vacio";
}

const DELTA_TONE: Record<KpiDeltaDirection, string> = {
  up: "op-field-text",
  down: "op-signal-text",
  flat: "text-ink-soft",
};

type StockRow = {
  id: string;
  clientName: string;
  inputName: string;
  unit: string;
  quantity: number;
};

/* ------------------------------------------------------------------ */
/* Small console building blocks                                       */
/* ------------------------------------------------------------------ */

function KpiTile({
  label,
  value,
  hint,
  delta,
  href,
  loading,
  signal = false,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: { text: string; direction: KpiDeltaDirection };
  href?: string;
  loading: boolean;
  signal?: boolean;
  icon?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="op-label">{label}</p>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      {loading ? (
        <div className="skeleton mt-2.5 h-8 w-24" aria-hidden="true" />
      ) : (
        <p className={`op-num mt-2 text-3xl font-bold leading-none ${signal ? "op-signal-text" : "text-ink"}`}>
          {value}
        </p>
      )}
      {!loading &&
        (delta ? (
          <p className={`mt-1.5 text-xs font-medium ${DELTA_TONE[delta.direction]}`}>{delta.text}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>
        ) : null)}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-busy={loading}
        className="op-plate group block p-4 transition-colors hover:bg-base-subtle"
      >
        {body}
        <span className="op-label mt-2 flex items-center gap-1 group-hover:text-ink">
          Ver cola <ArrowRightIcon className="h-3.5 w-3.5" />
        </span>
      </Link>
    );
  }
  return (
    <div className="op-plate p-4" aria-busy={loading}>
      {body}
    </div>
  );
}

function QueueSkeleton() {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 border-b border-agro-border px-4 py-3.5">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton ml-auto h-9 w-28" />
        </li>
      ))}
    </ul>
  );
}

function PlanSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-16" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [reports, setReports] = useState<DailyReportDTO[]>([]);
  const [receptions, setReceptions] = useState<ReceptionDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);

  const [focused, setFocused] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [rejectingKey, setRejectingKey] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      // A PRODUCTOR cannot read this admin index: send them to their own home
      // instead of firing the admin-only requests below.
      const stored = getStoredUser();
      if (stored && isClientRole(stored.role)) {
        router.replace("/dashboard/mi-campo");
        return;
      }

      try {
        const [reportsRes, receptionsRes, clientsRes] = await Promise.allSettled([
          listDailyReports(),
          listReceptions(),
          listClients(),
        ]);
        if (!alive) return;

        if (reportsRes.status === "fulfilled") setReports(reportsRes.value);
        if (receptionsRes.status === "fulfilled") setReceptions(receptionsRes.value);

        const clientList: ClientDTO[] =
          clientsRes.status === "fulfilled" ? clientsRes.value : [];
        setClients(clientList);

        const stockResults = await Promise.allSettled(
          clientList.map((client) => listStock(client.id)),
        );
        if (!alive) return;

        const rows: StockRow[] = [];
        stockResults.forEach((result, index) => {
          if (result.status !== "fulfilled") return;
          const client = clientList[index];
          result.value.forEach((entry: StockDTO) => {
            rows.push({
              id: entry.id,
              clientName: client.name,
              inputName: entry.inputName,
              unit: entry.unit,
              quantity: entry.quantity,
            });
          });
        });
        rows.sort(
          (a, b) =>
            a.clientName.localeCompare(b.clientName) ||
            a.inputName.localeCompare(b.inputName),
        );
        setStockRows(rows);

        const failed = [reportsRes, receptionsRes, clientsRes].some(
          (r) => r.status === "rejected",
        );
        if (failed) {
          setError(
            "Algunos datos no se pudieron cargar. Podés reintentar para actualizar el panel.",
          );
        }
      } catch {
        if (alive) {
          setError("No se pudo cargar el panel. Revisá tu conexión e intentá nuevamente.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [version, router]);

  /* ----- Queues (the actionable work leads) ----- */
  const pendingReports = useMemo(
    () => reports.filter((r) => r.status === "PENDIENTE_APROBACION"),
    [reports],
  );
  const pendingReceptions = useMemo(
    () => receptions.filter((r) => r.status === "PENDIENTE_VALIDACION"),
    [receptions],
  );
  const decisionCount = pendingReports.length + pendingReceptions.length;

  /* ----- Signature move: lot / client plan keyed to the queues ----- */
  const lotPlan = useMemo<LotPlanEntry[]>(() => {
    const map = new Map<
      string,
      { lotName: string; farmName: string; pending: number; approved: number; rejected: number; count: number }
    >();
    reports.forEach((r) => {
      const entry =
        map.get(r.lotId) ?? {
          lotName: r.lotName,
          farmName: r.farmName,
          pending: 0,
          approved: 0,
          rejected: 0,
          count: 0,
        };
      entry.count += 1;
      if (r.status === "PENDIENTE_APROBACION") entry.pending += 1;
      else if (r.status === "APROBADO") entry.approved += 1;
      else entry.rejected += 1;
      map.set(r.lotId, entry);
    });
    return [...map.entries()]
      .map(([id, e]) => ({
        id,
        lotName: e.lotName,
        farmName: e.farmName,
        count: e.count,
        status: dominantStatus(e.pending, e.approved, e.rejected),
      }))
      .sort(
        (a, b) => a.farmName.localeCompare(b.farmName) || a.lotName.localeCompare(b.lotName),
      );
  }, [reports]);

  const clientPlan = useMemo<ClientPlanEntry[]>(() => {
    const map = new Map<
      string,
      { name: string; pending: number; validated: number; rejected: number; count: number }
    >();
    receptions.forEach((r) => {
      const entry =
        map.get(r.clientId) ?? {
          name: r.clientName,
          pending: 0,
          validated: 0,
          rejected: 0,
          count: 0,
        };
      entry.count += 1;
      if (r.status === "PENDIENTE_VALIDACION") entry.pending += 1;
      else if (r.status === "VALIDADA") entry.validated += 1;
      else entry.rejected += 1;
      map.set(r.clientId, entry);
    });
    return [...map.entries()]
      .map(([id, e]) => ({
        id,
        name: e.name,
        count: e.count,
        status: dominantStatus(e.pending, e.validated, e.rejected),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [receptions]);

  /* ----- Weekly hectares/hours with a real week-over-week delta ----- */
  const weekStart = startOfWeek();
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
  const prevWeekStart = weekStart - 7 * 24 * 60 * 60 * 1000;

  const { weekHectares, weekHours, hectareDelta, hourDelta } = useMemo(() => {
    let curHa = 0;
    let curHs = 0;
    let prevHa = 0;
    let prevHs = 0;
    reports.forEach((r) => {
      const d = parseLocalDate(r.date);
      if (!d) return;
      const t = d.getTime();
      if (t >= weekStart && t < weekEnd) {
        curHa += r.hectares ?? 0;
        curHs += r.hours ?? 0;
      } else if (t >= prevWeekStart && t < weekStart) {
        prevHa += r.hectares ?? 0;
        prevHs += r.hours ?? 0;
      }
    });
    return {
      weekHectares: curHa,
      weekHours: curHs,
      hectareDelta: deltaMeta(curHa, prevHa),
      hourDelta: deltaMeta(curHs, prevHs),
    };
  }, [reports, weekStart, weekEnd, prevWeekStart]);

  const approvedPct =
    reports.length === 0
      ? 0
      : Math.round(
          (reports.filter((r) => r.status === "APROBADO").length / reports.length) * 100,
        );
  const validatedPct =
    receptions.length === 0
      ? 0
      : Math.round(
          (receptions.filter((r) => r.status === "VALIDADA").length / receptions.length) * 100,
        );

  /* ----- Designed charts from real data ----- */
  const activity = useMemo(() => {
    const days = lastNDays(14);
    const reportCounts = new Map<string, number>();
    const receptionCounts = new Map<string, number>();
    reports.forEach((r) => {
      const k = toDayKey(r.date);
      if (k) reportCounts.set(k, (reportCounts.get(k) ?? 0) + 1);
    });
    receptions.forEach((r) => {
      const k = toDayKey(r.date);
      if (k) receptionCounts.set(k, (receptionCounts.get(k) ?? 0) + 1);
    });
    return {
      labels: days.map((d) => d.label),
      series: [
        {
          key: "partes",
          label: "Partes de trabajo",
          color: "var(--op-signal)",
          values: days.map((d) => reportCounts.get(d.key) ?? 0),
        },
        {
          key: "recepciones",
          label: "Recepciones",
          color: "var(--op-ink)",
          values: days.map((d) => receptionCounts.get(d.key) ?? 0),
        },
      ] satisfies ChartSeries[],
    };
  }, [reports, receptions]);

  const weeklyReceptions = useMemo(() => {
    const days = lastNDays(7);
    const total = new Map<string, number>();
    const validated = new Map<string, number>();
    receptions.forEach((r) => {
      const k = toDayKey(r.date);
      if (k) total.set(k, (total.get(k) ?? 0) + 1);
      if (r.status === "VALIDADA") {
        const vk = toDayKey(r.validatedAt ?? r.date);
        if (vk) validated.set(vk, (validated.get(vk) ?? 0) + 1);
      }
    });
    return {
      labels: days.map((d) => d.label),
      series: [
        {
          key: "ingresos",
          label: "Ingresos",
          color: "var(--op-ink)",
          values: days.map((d) => total.get(d.key) ?? 0),
        },
        {
          key: "validadas",
          label: "Validadas",
          color: "var(--op-field)",
          values: days.map((d) => validated.get(d.key) ?? 0),
        },
      ] satisfies ChartSeries[],
    };
  }, [receptions]);

  const receptionStatus = useMemo(
    () => ({
      validated: receptions.filter((r) => r.status === "VALIDADA").length,
      pending: pendingReceptions.length,
      rejected: receptions.filter((r) => r.status === "RECHAZADA").length,
    }),
    [receptions, pendingReceptions],
  );

  const donutSegments: Segment[] = useMemo(
    () => [
      { label: RECEPTION_STATUS_LABELS.VALIDADA, value: receptionStatus.validated, color: "var(--op-field)" },
      { label: RECEPTION_STATUS_LABELS.PENDIENTE_VALIDACION, value: receptionStatus.pending, color: "var(--op-signal)" },
      { label: RECEPTION_STATUS_LABELS.RECHAZADA, value: receptionStatus.rejected, color: "var(--op-clay)" },
    ],
    [receptionStatus],
  );

  const isApprover = isApproverRole(user?.role);

  /* ----- Mutations (optimistic + reconcile) ----- */
  const reloadReports = useCallback(async () => {
    try {
      setReports(await listDailyReports());
    } catch {
      /* keep current list */
    }
  }, []);

  const reloadReceptions = useCallback(async () => {
    try {
      setReceptions(await listReceptions());
    } catch {
      /* keep current list */
    }
  }, []);

  const reloadStock = useCallback(async () => {
    if (clients.length === 0) return;
    try {
      const results = await Promise.allSettled(clients.map((c) => listStock(c.id)));
      const rows: StockRow[] = [];
      results.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const client = clients[index];
        result.value.forEach((entry: StockDTO) => {
          rows.push({
            id: entry.id,
            clientName: client.name,
            inputName: entry.inputName,
            unit: entry.unit,
            quantity: entry.quantity,
          });
        });
      });
      rows.sort(
        (a, b) =>
          a.clientName.localeCompare(b.clientName) || a.inputName.localeCompare(b.inputName),
      );
      setStockRows(rows);
    } catch {
      /* keep current stock */
    }
  }, [clients]);

  const resolveReport = useCallback(
    async (report: DailyReportDTO, action: "approve" | "reject") => {
      const key = `report:${report.id}`;
      if (pendingKey) return;
      setPendingKey(key);
      const previous = reports;
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? { ...r, status: action === "approve" ? "APROBADO" : "RECHAZADO" }
            : r,
        ),
      );
      try {
        if (action === "approve") await approveDailyReport(report.id);
        else await rejectDailyReport(report.id, rejectReason.trim());
        toast.success(
          action === "approve" ? "Parte aprobado" : "Parte rechazado",
          `${report.farmName} · ${report.lotName}`,
        );
        setRejectingKey(null);
        setRejectReason("");
        await reloadReports();
      } catch (err) {
        const feedback = describeError(err, "parte");
        setReports(previous);
        toast.error(feedback.message);
        if (feedback.refresh) await reloadReports();
      } finally {
        setPendingKey(null);
      }
    },
    [pendingKey, reports, rejectReason, reloadReports, toast],
  );

  const resolveReception = useCallback(
    async (reception: ReceptionDTO, action: "validate" | "reject") => {
      const key = `reception:${reception.id}`;
      if (pendingKey) return;
      setPendingKey(key);
      const previous = receptions;
      setReceptions((prev) =>
        prev.map((r) =>
          r.id === reception.id
            ? { ...r, status: action === "validate" ? "VALIDADA" : "RECHAZADA" }
            : r,
        ),
      );
      try {
        if (action === "validate") {
          const items = reception.items.map((item) => ({
            inputId: item.inputId,
            validatedQuantity: item.quantity,
          }));
          await validateReception(reception.id, items);
        } else {
          await rejectReception(reception.id, rejectReason.trim());
        }
        toast.success(
          action === "validate" ? "Recepción validada" : "Recepción rechazada",
          reception.clientName,
        );
        setRejectingKey(null);
        setRejectReason("");
        await reloadReceptions();
        if (action === "validate") await reloadStock();
      } catch (err) {
        const feedback = describeError(err, "recepción");
        setReceptions(previous);
        toast.error(feedback.message);
        if (feedback.refresh) await reloadReceptions();
      } finally {
        setPendingKey(null);
      }
    },
    [pendingKey, receptions, rejectReason, reloadReceptions, reloadStock, toast],
  );

  const startReject = useCallback((key: string) => {
    setRejectingKey(key);
    setRejectReason("");
  }, []);

  const cancelReject = useCallback(() => {
    setRejectingKey(null);
    setRejectReason("");
  }, []);

  const confirmRejectReport = useCallback(
    (report: DailyReportDTO) => {
      if (!rejectReason.trim()) {
        toast.error("Ingresá un motivo para rechazar el parte.");
        return;
      }
      void resolveReport(report, "reject");
    },
    [rejectReason, resolveReport, toast],
  );

  const confirmRejectReception = useCallback(
    (reception: ReceptionDTO) => {
      if (!rejectReason.trim()) {
        toast.error("Ingresá un motivo para rechazar la recepción.");
        return;
      }
      void resolveReception(reception, "reject");
    },
    [rejectReason, resolveReception, toast],
  );

  const onReasonKeyDown = useCallback(
    (confirm: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirm();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cancelReject();
      }
    },
    [cancelReject],
  );

  const stockColumns: DataTableColumn<StockRow>[] = [
    {
      key: "client",
      header: "Cliente",
      render: (row) => <span className="font-medium text-ink">{row.clientName}</span>,
    },
    {
      key: "input",
      header: "Insumo",
      render: (row) => <span className="text-ink-soft">{row.inputName}</span>,
    },
    {
      key: "quantity",
      header: "Stock",
      align: "right",
      render: (row) => (
        <span className="op-num font-semibold text-ink">
          {numberFmt.format(row.quantity)}
          <span className="ml-1 text-xs font-medium text-ink-faint">{row.unit}</span>
        </span>
      ),
    },
  ];

  // A PRODUCTOR only sees Mi Campo e Insumos; the admin index is not theirs.
  if (isClientRole(user?.role)) {
    return (
      <DashboardLayout title="Vista general" sidebarItems={navItems} breadcrumb="Panel principal">
        <Card className="flex items-center justify-center p-10">
          <Spinner label="Redirigiendo a Mi Campo…" />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vista general" sidebarItems={navItems} breadcrumb="Panel principal">
      {/* Command header */}
      <section className="op-plate mb-5 flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="op-label">Mesa de decisiones</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            {isApprover ? "Lo que espera tu decisión" : "La campaña, en foco"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            {isApprover
              ? "Aprobá los partes y validá las recepciones sin salir de la página; el plano se actualiza con cada decisión."
              : "Resumen de la operación según los partes y las recepciones cargados."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            {loading ? (
              <div className="skeleton ml-auto h-8 w-14" aria-hidden="true" />
            ) : (
              <p className="op-num text-3xl font-bold leading-none op-signal-text">{decisionCount}</p>
            )}
            <p className="op-label mt-1">Decisiones pendientes</p>
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
        <Alert tone="warning" title="Datos incompletos" className="mb-5" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Actionable queues + signature plan */}
      <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {/* Partes por aprobar */}
          <Card className="overflow-hidden">
            <CardHeader
              title="Partes por aprobar"
              subtitle={
                loading
                  ? "Cargando…"
                  : `${pendingReports.length} ${
                      pendingReports.length === 1 ? "parte" : "partes"
                    } esperando decisión`
              }
              action={
                <Link href="/dashboard/bandeja-aprobacion" className="op-btn op-btn--quiet">
                  Ver bandeja <ArrowRightIcon className="h-4 w-4" />
                </Link>
              }
            />
            {loading ? (
              <QueueSkeleton />
            ) : pendingReports.length === 0 ? (
              <EmptyState
                icon={<InboxIcon />}
                title="Nada pendiente"
                subtitle="No hay partes esperando aprobación."
              />
            ) : (
              <ul>
                {pendingReports.slice(0, 6).map((report) => {
                  const key = `report:${report.id}`;
                  const focusKey = `lot:${report.lotId}`;
                  const busy = pendingKey === key;
                  const isRejecting = rejectingKey === key;
                  return (
                    <li
                      key={report.id}
                      className="op-queue-row px-4 py-3"
                      data-active={focused === focusKey}
                      onMouseEnter={() => setFocused(focusKey)}
                      onMouseLeave={() => setFocused(null)}
                      onFocus={() => setFocused(focusKey)}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(null);
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {report.taskTypeName}
                          </p>
                          <p className="truncate text-xs text-ink-soft">{report.operatorName}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="op-caption">{fmtDate(report.date)}</span>
                          {isApprover ? (
                            <>
                              <button
                                type="button"
                                className="op-btn op-btn--reject"
                                disabled={busy}
                                onClick={() => startReject(key)}
                              >
                                Rechazar
                              </button>
                              <button
                                type="button"
                                className="op-btn op-btn--primary"
                                disabled={busy}
                                onClick={() => void resolveReport(report, "approve")}
                              >
                                {busy ? "Aprobando…" : "Aprobar"}
                              </button>
                            </>
                          ) : (
                            <Badge tone="wheat">Pendiente</Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                        <span className="flex items-center gap-1.5">
                          <span className="op-swatch" data-status="pendiente" aria-hidden="true" />
                          <span className="font-medium text-ink">{report.lotName}</span>
                        </span>
                        <span>{report.farmName}</span>
                        <span className="op-num">
                          {numberFmt.format(report.hectares)} ha · {numberFmt.format(report.hours)} hs
                        </span>
                        <span>{report.clientName}</span>
                      </div>

                      {isRejecting && (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="min-w-[14rem] flex-1">
                            <span className="op-caption">Motivo del rechazo</span>
                            <input
                              autoFocus
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              onKeyDown={onReasonKeyDown(() => confirmRejectReport(report))}
                              placeholder="Ej: las hectáreas no coinciden con la orden de trabajo"
                              disabled={busy}
                              className="op-input mt-1 w-full"
                            />
                          </label>
                          <button
                            type="button"
                            className="op-btn op-btn--reject"
                            disabled={busy || !rejectReason.trim()}
                            onClick={() => confirmRejectReport(report)}
                          >
                            {busy ? "Rechazando…" : "Confirmar rechazo"}
                          </button>
                          <button
                            type="button"
                            className="op-btn op-btn--quiet"
                            disabled={busy}
                            onClick={cancelReject}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Recepciones por validar */}
          <Card className="overflow-hidden">
            <CardHeader
              title="Recepciones por validar"
              subtitle={
                loading
                  ? "Cargando…"
                  : `${pendingReceptions.length} ${
                      pendingReceptions.length === 1 ? "recepción" : "recepciones"
                    } esperando validación`
              }
              action={
                <Link href="/dashboard/insumos" className="op-btn op-btn--quiet">
                  Ver recepciones <ArrowRightIcon className="h-4 w-4" />
                </Link>
              }
            />
            {loading ? (
              <QueueSkeleton />
            ) : pendingReceptions.length === 0 ? (
              <EmptyState
                icon={<InputsIcon />}
                title="Nada pendiente"
                subtitle="No hay recepciones esperando validación."
              />
            ) : (
              <ul>
                {pendingReceptions.slice(0, 6).map((reception) => {
                  const key = `reception:${reception.id}`;
                  const focusKey = `client:${reception.clientId}`;
                  const busy = pendingKey === key;
                  const isRejecting = rejectingKey === key;
                  const units = reception.items.reduce((acc, item) => acc + item.quantity, 0);
                  return (
                    <li
                      key={reception.id}
                      className="op-queue-row px-4 py-3"
                      data-active={focused === focusKey}
                      onMouseEnter={() => setFocused(focusKey)}
                      onMouseLeave={() => setFocused(null)}
                      onFocus={() => setFocused(focusKey)}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(null);
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {reception.clientName}
                          </p>
                          <p className="op-num truncate text-xs text-ink-soft">
                            {fmtDate(reception.date)} · {reception.items.length}{" "}
                            {reception.items.length === 1 ? "insumo" : "insumos"} ·{" "}
                            {numberFmt.format(units)} u.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isApprover ? (
                            <>
                              <button
                                type="button"
                                className="op-btn op-btn--reject"
                                disabled={busy}
                                onClick={() => startReject(key)}
                              >
                                Rechazar
                              </button>
                              <button
                                type="button"
                                className="op-btn op-btn--primary"
                                disabled={busy}
                                title="Valida las cantidades declaradas"
                                onClick={() => void resolveReception(reception, "validate")}
                              >
                                {busy ? "Validando…" : "Validar"}
                              </button>
                            </>
                          ) : (
                            <Badge tone="earth">Pendiente</Badge>
                          )}
                        </div>
                      </div>

                      {isRejecting && (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="min-w-[14rem] flex-1">
                            <span className="op-caption">Motivo del rechazo</span>
                            <input
                              autoFocus
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              onKeyDown={onReasonKeyDown(() => confirmRejectReception(reception))}
                              placeholder="Ej: la cantidad declarada no coincide con el remito"
                              disabled={busy}
                              className="op-input mt-1 w-full"
                            />
                          </label>
                          <button
                            type="button"
                            className="op-btn op-btn--reject"
                            disabled={busy || !rejectReason.trim()}
                            onClick={() => confirmRejectReception(reception)}
                          >
                            {busy ? "Rechazando…" : "Confirmar rechazo"}
                          </button>
                          <button
                            type="button"
                            className="op-btn op-btn--quiet"
                            disabled={busy}
                            onClick={cancelReject}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && pendingReceptions.length > 0 && (
              <p className="border-t border-agro-border px-4 py-2.5 text-xs text-ink-faint">
                La validación acepta las cantidades declaradas. El ajuste fino del stock se hace en
                Insumos.
              </p>
            )}
          </Card>
        </div>

        {/* Signature move: the parcel plan with a status legend */}
        <Card className="overflow-hidden self-start xl:sticky xl:top-20">
          <CardHeader
            title="Plano de lotes"
            subtitle="Cada fila de la cola se referencia a su lote."
          />
          <div className="op-plan p-3">
            {loading ? (
              <PlanSkeleton />
            ) : lotPlan.length === 0 ? (
              <EmptyState
                icon={<FieldIcon />}
                title="Sin lotes con partes"
                subtitle="Cuando se carguen partes, sus lotes aparecerán en el plano."
              />
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {lotPlan.map((lot) => (
                  <li key={lot.id}>
                    <button
                      type="button"
                      data-status={lot.status}
                      data-active={focused === `lot:${lot.id}`}
                      aria-label={`Lote ${lot.lotName}, ${lot.farmName}: ${lot.count} ${
                        lot.count === 1 ? "parte" : "partes"
                      }`}
                      className="op-parcel flex w-full flex-col gap-1 px-2.5 py-2 text-left"
                      onMouseEnter={() => setFocused(`lot:${lot.id}`)}
                      onMouseLeave={() => setFocused(null)}
                      onFocus={() => setFocused(`lot:${lot.id}`)}
                      onBlur={() => setFocused(null)}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="op-swatch" data-status={lot.status} aria-hidden="true" />
                        <span className="truncate text-xs font-semibold">{lot.lotName}</span>
                      </span>
                      <span className="op-caption truncate">{lot.farmName}</span>
                      <span className="op-num text-xs text-ink-soft">
                        {lot.count} {lot.count === 1 ? "parte" : "partes"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-agro-border px-4 py-3">
            <p className="op-label mb-2">Referencias</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 xl:grid-cols-2">
              {PLAN_LEGEND.map((item) => (
                <li key={item.status} className="flex items-center gap-2 text-xs text-ink-soft">
                  <span className="op-swatch" data-status={item.status} aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          {clientPlan.length > 0 && (
            <div className="border-t border-agro-border px-4 py-3">
              <p className="op-label mb-2">Recepciones por cliente</p>
              <ul className="flex flex-wrap gap-2">
                {clientPlan.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      data-status={client.status}
                      data-active={focused === `client:${client.id}`}
                      aria-label={`Cliente ${client.name}: ${client.count} ${
                        client.count === 1 ? "recepción" : "recepciones"
                      }`}
                      className="op-parcel flex items-center gap-2 px-2.5 py-1.5 text-xs"
                      onMouseEnter={() => setFocused(`client:${client.id}`)}
                      onMouseLeave={() => setFocused(null)}
                      onFocus={() => setFocused(`client:${client.id}`)}
                      onBlur={() => setFocused(null)}
                    >
                      <span className="op-swatch" data-status={client.status} aria-hidden="true" />
                      <span className="font-medium">{client.name}</span>
                      <span className="op-num text-ink-faint">{client.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>

      {/* The four KPIs that matter; the two backlogs deep-link into their queues */}
      <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label="Partes por aprobar"
          value={String(pendingReports.length)}
          hint={`de ${reports.length} partes`}
          href="/dashboard/bandeja-aprobacion"
          loading={loading}
          signal
          icon={<InboxIcon className="h-4 w-4" />}
        />
        <KpiTile
          label="Recepciones por validar"
          value={String(pendingReceptions.length)}
          hint={`de ${receptions.length} registradas`}
          href="/dashboard/insumos"
          loading={loading}
          signal
          icon={<InputsIcon className="h-4 w-4" />}
        />
        <KpiTile
          label="Hectáreas esta semana"
          value={`${numberFmt.format(weekHectares)} ha`}
          delta={hectareDelta}
          loading={loading}
          icon={<FieldIcon className="h-4 w-4" />}
        />
        <KpiTile
          label="Horas esta semana"
          value={`${numberFmt.format(weekHours)} hs`}
          delta={hourDelta}
          loading={loading}
        />
      </section>

      {/* Real charts, below the actionable work */}
      <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Actividad diaria"
            subtitle="Partes de trabajo y recepciones de los últimos 14 días"
            action={<Badge tone="slate">14 días</Badge>}
          />
          <div className="px-4 pb-4 pt-5">
            <TrendChart
              labels={activity.labels}
              series={activity.series}
              height={260}
              loading={loading}
              ariaLabel="Partes de trabajo y recepciones por día"
              emptyMessage="Todavía no hay partes ni recepciones en los últimos 14 días."
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Estado de recepciones"
            subtitle={
              loading
                ? "Cargando…"
                : `${receptions.length} ${
                    receptions.length === 1 ? "recepción" : "recepciones"
                  } en total`
            }
          />
          {loading ? (
            <div className="flex flex-col items-center gap-5 px-5 py-6" aria-hidden="true">
              <div className="skeleton h-40 w-40 rounded-full" />
              <div className="skeleton h-4 w-40" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 px-5 py-6">
              <Donut
                segments={donutSegments}
                size={156}
                thickness={18}
                ariaLabel="Distribución de recepciones por estado"
                center={
                  <div className="text-center">
                    <p className="op-num font-display text-kpi text-ink">{validatedPct}%</p>
                    <p className="op-label">validadas</p>
                  </div>
                }
              />
              <ul className="w-full space-y-2">
                {donutSegments.map((seg) => (
                  <li key={seg.label} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-ink-soft">
                      <span
                        className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/5"
                        style={{ backgroundColor: seg.color }}
                      />
                      {seg.label}
                    </span>
                    <span className="op-num text-sm font-semibold text-ink">{seg.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Recepciones vs validadas"
            subtitle="Ingresos declarados y efectivamente validados, últimos 7 días"
            action={<Badge tone="slate">7 días</Badge>}
          />
          <div className="px-4 pb-4 pt-5">
            <BarChart
              labels={weeklyReceptions.labels}
              series={weeklyReceptions.series}
              height={230}
              loading={loading}
              ariaLabel="Ingresos y recepciones validadas por día"
              emptyMessage="No hay recepciones registradas en los últimos 7 días."
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Resumen operativo" subtitle="Avance sobre el total cargado" />
          <div className="space-y-5 px-5 py-6">
            <div>
              <div className="flex items-end justify-between">
                <span className="text-sm text-ink-soft">Aprobación de partes</span>
                {loading ? (
                  <div className="skeleton h-5 w-12" aria-hidden="true" />
                ) : (
                  <span className="op-num font-display text-title font-semibold text-ink">
                    {approvedPct}%
                  </span>
                )}
              </div>
              {loading ? (
                <div className="skeleton mt-2 h-2 w-full" aria-hidden="true" />
              ) : (
                <ProgressBar
                  className="mt-2"
                  value={approvedPct}
                  label="Aprobación de partes"
                  tone={approvedPct >= 70 ? "green" : approvedPct >= 40 ? "wheat" : "earth"}
                />
              )}
              {!loading && (
                <p className="mt-1.5 text-xs text-ink-faint">
                  {reports.filter((r) => r.status === "APROBADO").length} de {reports.length}{" "}
                  aprobados
                </p>
              )}
            </div>

            <div>
              <div className="flex items-end justify-between">
                <span className="text-sm text-ink-soft">Validación de recepciones</span>
                {loading ? (
                  <div className="skeleton h-5 w-12" aria-hidden="true" />
                ) : (
                  <span className="op-num font-display text-title font-semibold text-ink">
                    {validatedPct}%
                  </span>
                )}
              </div>
              {loading ? (
                <div className="skeleton mt-2 h-2 w-full" aria-hidden="true" />
              ) : (
                <ProgressBar
                  className="mt-2"
                  value={validatedPct}
                  label="Validación de recepciones"
                  tone={validatedPct >= 70 ? "green" : validatedPct >= 40 ? "wheat" : "earth"}
                />
              )}
              {!loading && (
                <p className="mt-1.5 text-xs text-ink-faint">
                  {receptionStatus.validated} de {receptions.length} validadas
                </p>
              )}
            </div>

            <div className="border-t border-agro-border pt-4">
              <StatRow label="Clientes" value={loading ? "…" : String(clients.length)} />
            </div>
          </div>
        </Card>
      </section>

      {/* Real product content: stock por cliente */}
      <section className="mb-6">
        <Card className="overflow-hidden">
          <CardHeader
            title="Estado de insumos"
            subtitle="Stock disponible por cliente según recepciones validadas"
            action={
              <Link href="/dashboard/insumos" className="op-btn op-btn--quiet">
                Gestionar insumos <ArrowRightIcon className="h-4 w-4" />
              </Link>
            }
          />
          <DataTable
            columns={stockColumns}
            data={stockRows}
            rowKey={(row) => row.id}
            loading={loading}
            skeletonRows={4}
            caption="Stock disponible por cliente e insumo"
            emptyState={
              <EmptyState
                icon={<InputsIcon />}
                title="Sin stock registrado"
                subtitle="Cuando se validen recepciones, el stock por cliente aparecerá acá."
              />
            }
          />
        </Card>
      </section>

      {!loading && (pendingReports.length > 6 || pendingReceptions.length > 6) && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <AlertIcon className="h-4 w-4" />
          Hay más pendientes que los mostrados. Abrí la bandeja o Insumos para ver el total.
        </p>
      )}
    </DashboardLayout>
  );
}
