"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  type KpiDeltaDirection,
} from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { isApproverRole, isClientRole, navItems } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertIcon,
  ArrowRightIcon,
  FieldIcon,
  InboxIcon,
  InputsIcon,
  PlusIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import {
  TrendChart,
  type ChartSeries,
} from "@/components/ui/charts";
import {
  DailyTasksTimeline,
  hasFollowUpTaskForAlert,
} from "@/components/dashboard/daily-tasks-timeline";
import { FieldTelemetryStrip } from "@/components/dashboard/field-telemetry-strip";
import { CreateTaskFromAlertModal } from "@/components/recetas/create-task-from-alert-modal";
import {
  ApiError,
  approveDailyReport,
  getGrainPrices,
  getLotWeather,
  getStoredUser,
  getUsdOfficial,
  listDailyReports,
  listLaborTypes,
  listLots,
  listReapplicationAlerts,
  listReceptions,
  listTasks,
  listUsers,
  rejectDailyReport,
  rejectReception,
  validateReception,
  type DailyReportDTO,
  type GrainPricesResponse,
  type LaborTypeDTO,
  type ReapplicationAlertDTO,
  type ReceptionDTO,
  type TaskDTO,
  type UsdRateResponse,
  type UserDTO,
  type WeatherResponse,
} from "@/api/client";
import {
  GrainPricesWidget,
  RadarWidget,
  UsdWidget,
  WeatherWidget,
  WindWidget,
  type WeatherLotOption,
} from "@/components/weather/weather-widgets";

// Leaflet needs `window`, so the map is client-only and never server-rendered.
const LeafletMap = dynamic(() => import("@/components/weather/leaflet-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-72 w-full" aria-hidden="true" />,
});

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

const DELTA_TONE: Record<KpiDeltaDirection, string> = {
  up: "op-field-text",
  down: "op-signal-text",
  flat: "text-ink-soft",
};

const ALERT_URGENCY_META = {
  OVERDUE: { label: "Vencida", tone: "earth" as const },
  DUE_TODAY: { label: "Vence hoy", tone: "wheat" as const },
  UPCOMING: { label: "Por vencer", tone: "green" as const },
};

/* ------------------------------------------------------------------ */
/* Small console building blocks                                       */
/* ------------------------------------------------------------------ */

function WeeklyPulseTile({
  label,
  value,
  delta,
  loading,
  icon,
}: {
  label: string;
  value: string;
  delta: { text: string; direction: KpiDeltaDirection };
  loading: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="op-plate flex flex-1 flex-col justify-between p-4" aria-busy={loading}>
      <div className="flex items-start justify-between gap-2">
        <p className="op-label">{label}</p>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      {loading ? (
        <div className="skeleton mt-3 h-8 w-24" aria-hidden="true" />
      ) : (
        <>
          <p className="op-num mt-2 text-3xl font-bold leading-none text-ink">{value}</p>
          <p className={`mt-2 text-xs font-medium ${DELTA_TONE[delta.direction]}`}>
            {delta.text}
          </p>
        </>
      )}
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const effectiveRole = user?.role ?? getStoredUser()?.role;
  const isApprover = isApproverRole(effectiveRole);
  const canCreateTask =
    effectiveRole === "ADMIN" || effectiveRole === "SUPERVISOR";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [reports, setReports] = useState<DailyReportDTO[]>([]);
  const [receptions, setReceptions] = useState<ReceptionDTO[]>([]);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [alerts, setAlerts] = useState<ReapplicationAlertDTO[]>([]);
  const [laborTypes, setLaborTypes] = useState<LaborTypeDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [taskAlert, setTaskAlert] = useState<ReapplicationAlertDTO | null>(null);

  // External integrations block (weather, radar, USD, grain board).
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLots, setWeatherLots] = useState<WeatherLotOption[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [usdRate, setUsdRate] = useState<UsdRateResponse | null>(null);
  const [grainPrices, setGrainPrices] = useState<GrainPricesResponse | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherVersion, setWeatherVersion] = useState(0);

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [rejectingKey, setRejectingKey] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setVersion((v) => v + 1);
    setMarketLoading(true);
    setWeatherLoading(true);
    setWeatherError(null);
    setWeatherVersion((v) => v + 1);
  }, []);

  const reloadTasksAndAlerts = useCallback(async () => {
    try {
      const [taskList, alertList] = await Promise.all([
        listTasks(),
        listReapplicationAlerts(),
      ]);
      setTasks(Array.isArray(taskList) ? taskList : []);
      setAlerts(Array.isArray(alertList) ? alertList : []);
    } catch {
      /* keep current state */
    }
  }, []);

  // Loading is flagged here, in the event handler, so the weather effect below
  // only writes state after its await.
  const handleWeatherLotChange = useCallback((lotId: string) => {
    setWeatherLoading(true);
    setWeatherError(null);
    setSelectedLotId(lotId);
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
        const [
          reportsRes,
          receptionsRes,
          tasksRes,
          alertsRes,
          laborTypesRes,
          usersRes,
        ] = await Promise.allSettled([
          listDailyReports(),
          listReceptions(),
          listTasks(),
          listReapplicationAlerts(),
          canCreateTask ? listLaborTypes() : Promise.resolve([]),
          canCreateTask ? listUsers().catch(() => []) : Promise.resolve([]),
        ]);
        if (!alive) return;

        if (reportsRes.status === "fulfilled") setReports(reportsRes.value);
        if (receptionsRes.status === "fulfilled") setReceptions(receptionsRes.value);
        if (tasksRes.status === "fulfilled") {
          setTasks(Array.isArray(tasksRes.value) ? tasksRes.value : []);
        }
        if (alertsRes.status === "fulfilled") {
          setAlerts(Array.isArray(alertsRes.value) ? alertsRes.value : []);
        }
        if (laborTypesRes.status === "fulfilled") {
          setLaborTypes(Array.isArray(laborTypesRes.value) ? laborTypesRes.value : []);
        }
        if (usersRes.status === "fulfilled") {
          setUsers(Array.isArray(usersRes.value) ? usersRes.value : []);
        }

        const failed = [reportsRes, receptionsRes, tasksRes].some(
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
  }, [version, router, canCreateTask]);

  // Integrations block. USD and grain prices are global market data; the
  // weather is resolved server-side from a lot with a polygon or coordinates.
  useEffect(() => {
    if (isClientRole(user?.role)) return;
    let alive = true;

    (async () => {
      const [lotsRes, usdRes, grainsRes] = await Promise.allSettled([
        listLots(),
        getUsdOfficial(),
        getGrainPrices(),
      ]);
      if (!alive) return;

      if (usdRes.status === "fulfilled") setUsdRate(usdRes.value);
      if (grainsRes.status === "fulfilled") setGrainPrices(grainsRes.value);
      setMarketLoading(false);

      if (lotsRes.status === "rejected") {
        setWeatherLots([]);
        setSelectedLotId(null);
        setWeather(null);
        setWeatherError("No se pudo cargar el clima. Reintentá en unos minutos.");
        setWeatherLoading(false);
        return;
      }

      const options: WeatherLotOption[] = lotsRes.value
        .filter((l) => Boolean(l.polygon || (l.coords && l.coords.trim())))
        .map((l) => ({ id: l.id, name: l.name }));
      setWeatherLots(options);

      if (options.length === 0) {
        setSelectedLotId(null);
        setWeather(null);
        setWeatherError("Delimitá un lote en Mi Campo para ver clima, viento y radar.");
        setWeatherLoading(false);
        return;
      }

      setSelectedLotId((prev) =>
        prev && options.some((o) => o.id === prev) ? prev : options[0].id,
      );
    })();

    return () => {
      alive = false;
    };
  }, [weatherVersion, user?.role]);

  // Weather for the selected lot. Re-runs on a lot change and on refresh.
  useEffect(() => {
    if (!selectedLotId) return;
    let alive = true;

    (async () => {
      try {
        const resolved = await getLotWeather(selectedLotId);
        if (!alive) return;
        setWeather(resolved);
        setWeatherError(null);
      } catch {
        if (!alive) return;
        // Never leave the previous lot's weather under the new lot's name.
        setWeather(null);
        setWeatherError("No se pudo cargar el clima. Reintentá en unos minutos.");
      } finally {
        if (alive) setWeatherLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedLotId, weatherVersion]);

  const weatherLocationName =
    weatherLots.find((lot) => lot.id === selectedLotId)?.name ?? null;

  /* ----- Queues (the actionable work) ----- */
  const pendingReports = useMemo(
    () => reports.filter((r) => r.status === "PENDIENTE_APROBACION"),
    [reports],
  );
  const pendingReceptions = useMemo(
    () => receptions.filter((r) => r.status === "PENDIENTE_VALIDACION"),
    [receptions],
  );
  const decisionCount = pendingReports.length + pendingReceptions.length;

  /* ----- Due double-hit alerts without a follow-up task ----- */
  const unassignedDueAlerts = useMemo(
    () => alerts.filter((alert) => !hasFollowUpTaskForAlert(alert, tasks)),
    [alerts, tasks],
  );

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

  /* ----- Daily activity chart (14 days) ----- */
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
      } catch (err) {
        const feedback = describeError(err, "recepción");
        setReceptions(previous);
        toast.error(feedback.message);
        if (feedback.refresh) await reloadReceptions();
      } finally {
        setPendingKey(null);
      }
    },
    [pendingKey, receptions, rejectReason, reloadReceptions, toast],
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

  const marketError = marketLoading
    ? null
    : "No se pudo cargar la información de mercado. Reintentá en unos minutos.";

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
      {/* 1. Command header + Integrated telemetry strip */}
      <section className="op-plate mb-4 flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="op-label">Mesa de decisiones</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            Centro de operaciones
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            {isApprover
              ? "Seguí la jornada en campo, las alertas por vencer y las aprobaciones pendientes."
              : "Seguí la jornada en campo y el resumen de partes y recepciones."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-1 text-right">
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
          {canCreateTask && (
            <Link href="/dashboard/produccion" className="op-btn op-btn--primary">
              <PlusIcon className="h-4 w-4" />
              Nueva tarea
            </Link>
          )}
        </div>
      </section>

      <FieldTelemetryStrip
        weather={weather}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        lots={weatherLots}
        selectedLotId={selectedLotId}
        onLotChange={handleWeatherLotChange}
        usdRate={usdRate}
        grainPrices={grainPrices}
        marketLoading={marketLoading}
      />

      {error && (
        <Alert tone="warning" title="Datos incompletos" className="mb-5" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 2. Due double-hit alerts without a follow-up task */}
      {!loading && unassignedDueAlerts.length > 0 && (
        <Card className="mb-6 overflow-hidden border-l-4 border-l-agro-earth">
          <CardHeader
            title="Alertas de doble golpe por vencer"
            subtitle="Recetas próximas a re-aplicación que todavía no tienen una nueva tarea asignada."
            action={
              <Link href="/dashboard/recetas" className="op-btn op-btn--quiet">
                Ver todas en Recetas <ArrowRightIcon className="h-4 w-4" />
              </Link>
            }
          />
          <ul className="divide-y divide-agro-border">
            {unassignedDueAlerts.map((alert) => {
              const urgency = ALERT_URGENCY_META[alert.urgency];
              return (
                <li
                  key={alert.recipeId}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={urgency.tone}>{urgency.label}</Badge>
                      <p className="text-sm font-semibold text-ink">
                        {alert.farmName} · {alert.lotName}
                      </p>
                      <span className="text-xs text-ink-soft">
                        ({alert.clientName})
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      <span className="font-medium text-ink">
                        {alert.crop ?? "Cultivo s/d"} · {alert.pest ?? "Control fitosanitario"}
                      </span>
                      {" · "}
                      Re-aplicación: <span className="op-num font-medium">{fmtDate(alert.targetDate)}</span>
                      {alert.daysRemaining < 0
                        ? ` (${Math.abs(alert.daysRemaining)} d vencida)`
                        : alert.daysRemaining === 0
                          ? " (¡Hoy!)"
                          : ` (en ${alert.daysRemaining} d)`}
                    </p>
                  </div>

                  {canCreateTask && (
                    <Button
                      variant="secondary"
                      onClick={() => setTaskAlert(alert)}
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Crear tarea
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* 3. Horizontal timeline of today's tasks */}
      <DailyTasksTimeline tasks={tasks} loading={loading} />

      {/* 4. Actionable decision queues (2 balanced columns) */}
      <section className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                const busy = pendingKey === key;
                const isRejecting = rejectingKey === key;
                return (
                  <li key={report.id} className="op-queue-row px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {report.laborTypeName}
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
                      <span className="font-medium text-ink">{report.lotName}</span>
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
                const busy = pendingKey === key;
                const isRejecting = rejectingKey === key;
                const units = reception.items.reduce((acc, item) => acc + item.quantity, 0);
                return (
                  <li key={reception.id} className="op-queue-row px-4 py-3">
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
      </section>

      {/* Weekly pulse + 14-day activity chart (non-redundant) */}
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
              height={240}
              loading={loading}
              ariaLabel="Partes de trabajo y recepciones por día"
              emptyMessage="Todavía no hay partes ni recepciones en los últimos 14 días."
            />
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <WeeklyPulseTile
            label="Hectáreas esta semana"
            value={`${numberFmt.format(weekHectares)} ha`}
            delta={hectareDelta}
            loading={loading}
            icon={<FieldIcon className="h-4 w-4" />}
          />
          <WeeklyPulseTile
            label="Horas esta semana"
            value={`${numberFmt.format(weekHours)} hs`}
            delta={hourDelta}
            loading={loading}
          />
        </div>
      </section>

      {/* 5. Field conditions & market details (anchored from telemetry strip) */}
      <section id="condiciones-campo" className="mb-6 scroll-mt-20">
        <p className="op-label mb-3">Condiciones de campo y mercado</p>

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <RadarWidget
            data={weather}
            loading={weatherLoading}
            error={weatherError}
            map={weather ? <LeafletMap weather={weather} className="h-72 w-full" /> : null}
          />
          <GrainPricesWidget
            data={grainPrices}
            loading={marketLoading}
            error={grainPrices ? null : marketError}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <WeatherWidget
            data={weather}
            loading={weatherLoading}
            error={weatherError}
            locationName={weatherLocationName ?? undefined}
            lots={weatherLots}
            selectedLotId={selectedLotId}
            onLotChange={handleWeatherLotChange}
          />
          <WindWidget data={weather} loading={weatherLoading} error={weatherError} />
          <UsdWidget data={usdRate} loading={marketLoading} error={usdRate ? null : marketError} />
        </div>
      </section>

      {!loading && (pendingReports.length > 6 || pendingReceptions.length > 6) && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <AlertIcon className="h-4 w-4" />
          Hay más pendientes que los mostrados. Abrí la bandeja o Insumos para ver el total.
        </p>
      )}

      <CreateTaskFromAlertModal
        alert={taskAlert}
        laborTypes={laborTypes}
        users={users}
        onClose={() => setTaskAlert(null)}
        onCreated={() => void reloadTasksAndAlerts()}
      />
    </DashboardLayout>
  );
}
