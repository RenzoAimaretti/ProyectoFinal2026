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
  HeroBand,
  KpiCard,
  ProgressBar,
  StatRow,
  StatusBadge,
  type KpiDeltaDirection,
  type StatusMap,
} from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import { DataTable, type DataTableColumn } from "@/components/ui/table";
import {
  navItems,
  modulesForRole,
  navIcon,
  isApproverRole,
  isClientRole,
} from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import { Spinner } from "@/components/ui/spinner";
import {
  DashboardIcon,
  FieldIcon,
  InboxIcon,
  InputsIcon,
  MachineIcon,
  ProductionIcon,
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
  apiGet,
  getStoredUser,
  listClients,
  listDailyReports,
  listReceptions,
  listStock,
  RECEPTION_STATUS_LABELS,
  type ClientDTO,
  type DailyReportDTO,
  type MachineDTO,
  type ReceptionDTO,
  type ReceptionStatus,
  type StockDTO,
  type TaskDTO,
} from "@/api/client";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const numberFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/** Parses a date (date-only or ISO) into a local Date without timezone drift. */
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

/** Ordered buckets for the last `count` days, oldest first. */
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

/** Real week-over-week delta, only reported when there is a previous baseline. */
function deltaMeta(current: number, previous: number): { text: string; direction: KpiDeltaDirection } {
  if (previous <= 0) return { text: "Primera semana con datos", direction: "flat" };
  const pct = Math.round(((current - previous) / previous) * 100);
  const direction: KpiDeltaDirection = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return { text: `${pct > 0 ? "+" : ""}${pct}% vs semana anterior`, direction };
}

const RECEPTION_BADGE: StatusMap<ReceptionStatus> = {
  PENDIENTE_VALIDACION: { label: RECEPTION_STATUS_LABELS.PENDIENTE_VALIDACION, tone: "wheat" },
  VALIDADA: { label: RECEPTION_STATUS_LABELS.VALIDADA, tone: "green" },
  RECHAZADA: { label: RECEPTION_STATUS_LABELS.RECHAZADA, tone: "earth" },
};

type StockRow = {
  id: string;
  clientName: string;
  inputName: string;
  unit: string;
  quantity: number;
};

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reports, setReports] = useState<DailyReportDTO[]>([]);
  const [receptions, setReceptions] = useState<ReceptionDTO[]>([]);
  const [machines, setMachines] = useState<MachineDTO[]>([]);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    // A PRODUCTOR cannot read this admin index: send them to their own home
    // instead of firing the admin-only requests below.
    const stored = getStoredUser();
    if (stored && isClientRole(stored.role)) {
      setLoading(false);
      router.replace("/dashboard/mi-campo");
      return;
    }

    let alive = true;
    (async () => {
      try {
        const [reportsRes, receptionsRes, clientsRes, machinesRes, tasksRes] =
          await Promise.allSettled([
            listDailyReports(),
            listReceptions(),
            listClients(),
            apiGet<MachineDTO[]>("/machines"),
            apiGet<TaskDTO[]>("/tasks"),
          ]);
        if (!alive) return;

        if (reportsRes.status === "fulfilled") setReports(reportsRes.value);
        if (receptionsRes.status === "fulfilled") setReceptions(receptionsRes.value);
        if (machinesRes.status === "fulfilled") setMachines(machinesRes.value);
        if (tasksRes.status === "fulfilled") setTasks(tasksRes.value);

        const clients: ClientDTO[] =
          clientsRes.status === "fulfilled" ? clientsRes.value : [];
        setClientCount(clients.length);

        const stockResults = await Promise.allSettled(
          clients.map((client) => listStock(client.id)),
        );
        if (!alive) return;

        const rows: StockRow[] = [];
        stockResults.forEach((result, index) => {
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
            a.clientName.localeCompare(b.clientName) ||
            a.inputName.localeCompare(b.inputName),
        );
        setStockRows(rows);

        const failed = [
          reportsRes,
          receptionsRes,
          clientsRes,
          machinesRes,
          tasksRes,
        ].some((r) => r.status === "rejected");
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

  const pendingReports = useMemo(
    () => reports.filter((r) => r.status === "PENDIENTE_APROBACION"),
    [reports],
  );
  const pendingReceptions = useMemo(
    () => receptions.filter((r) => r.status === "PENDIENTE_VALIDACION"),
    [receptions],
  );
  const activeMachines = useMemo(
    () => machines.filter((m) => m.status === "ACTIVA"),
    [machines],
  );
  const tasksInProgress = useMemo(
    () => tasks.filter((t) => t.status === "EN_PROGRESO"),
    [tasks],
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
          color: "var(--color-agro-green)",
          values: days.map((d) => reportCounts.get(d.key) ?? 0),
        },
        {
          key: "recepciones",
          label: "Recepciones",
          color: "var(--color-agro-earth)",
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
          color: "var(--color-agro-ochre)",
          values: days.map((d) => total.get(d.key) ?? 0),
        },
        {
          key: "validadas",
          label: "Validadas",
          color: "var(--color-agro-green)",
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
      { label: RECEPTION_STATUS_LABELS.VALIDADA, value: receptionStatus.validated, color: "var(--color-agro-green)" },
      { label: RECEPTION_STATUS_LABELS.PENDIENTE_VALIDACION, value: receptionStatus.pending, color: "var(--color-agro-wheat)" },
      { label: RECEPTION_STATUS_LABELS.RECHAZADA, value: receptionStatus.rejected, color: "var(--color-agro-earth)" },
    ],
    [receptionStatus],
  );

  const visibleModules = modulesForRole(navItems, user?.role);
  const isApprover = isApproverRole(user?.role);

  /* ----- Protagonist metric (role-aware, real) ----- */
  const heroMetric = isApprover
    ? String(pendingReports.length)
    : numberFmt.format(weekHectares);
  const heroMetricLabel = isApprover ? "Partes por aprobar" : "Hectáreas esta semana";
  const heroMetricHint = isApprover
    ? `de ${reports.length} partes en total`
    : `${reports.length} partes cargados`;

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
        <span className="font-semibold text-ink">
          {numberFmt.format(row.quantity)}
          <span className="ml-1 text-xs font-medium text-ink-faint">{row.unit}</span>
        </span>
      ),
    },
  ];

  // A PRODUCTOR only sees Mi Campo e Insumos; the admin index is not theirs.
  if (isClientRole(user?.role)) {
    return (
      <DashboardLayout
        title="Vista general"
        sidebarItems={navItems}
        breadcrumb="Panel principal"
      >
        <Card className="flex items-center justify-center p-10">
          <Spinner label="Redirigiendo a Mi Campo…" />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Vista general"
      sidebarItems={navItems}
      breadcrumb="Panel principal"
    >
      <HeroBand
        kicker="Panel principal"
        title={isApprover ? "Lo que espera tu decisión" : "La campaña, en foco"}
        description={
          isApprover
            ? "Pulso de la operación y backlog pendiente de aprobación y validación."
            : "Resumen de la operación de la campaña según los partes y recepciones cargados."
        }
        icon={<DashboardIcon className="h-6 w-6" />}
        metric={heroMetric}
        metricLabel={heroMetricLabel}
        metricHint={heroMetricHint}
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2.5 text-sm font-semibold text-agro-green-deep transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon className="h-4 w-4" />
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        }
      />

      {error && (
        <Alert
          tone="warning"
          title="Datos incompletos"
          className="mb-5"
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* KPIs reales con contexto y delta calculados */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Partes por aprobar"
          value={pendingReports.length}
          delta={`de ${reports.length} partes`}
          tone="wheat"
          icon={<InboxIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Recepciones por validar"
          value={pendingReceptions.length}
          delta={`de ${receptions.length} registradas`}
          tone="earth"
          icon={<InputsIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Máquinas activas"
          value={activeMachines.length}
          delta={`de ${machines.length} registradas`}
          tone="green"
          icon={<MachineIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Labores en curso"
          value={tasksInProgress.length}
          delta={`de ${tasks.length} tareas`}
          tone="slate"
          icon={<ProductionIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Hectáreas esta semana"
          value={`${numberFmt.format(weekHectares)} ha`}
          delta={hectareDelta.text}
          deltaDirection={hectareDelta.direction}
          tone="green"
          icon={<FieldIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Horas esta semana"
          value={`${numberFmt.format(weekHours)} hs`}
          delta={hourDelta.text}
          deltaDirection={hourDelta.direction}
          tone="slate"
          icon={<DashboardIcon className="h-5 w-5" />}
        />
      </section>

      {/* Actividad diaria + estado de recepciones */}
      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Actividad diaria"
            subtitle="Partes de trabajo y recepciones de los últimos 14 días"
            action={<Badge tone="green">14 días</Badge>}
          />
          <div className="px-4 pb-4 pt-5">
            <TrendChart
              labels={activity.labels}
              series={activity.series}
              height={260}
              ariaLabel="Partes de trabajo y recepciones por día"
              emptyMessage="Todavía no hay partes ni recepciones en los últimos 14 días."
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Estado de recepciones"
            subtitle={`${receptions.length} ${
              receptions.length === 1 ? "recepción" : "recepciones"
            } en total`}
          />
          <div className="flex flex-col items-center gap-5 px-5 py-6">
            <Donut
              segments={donutSegments}
              size={156}
              thickness={18}
              center={
                <div className="text-center">
                  <p className="text-numeric font-display text-kpi text-ink">{validatedPct}%</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                    validadas
                  </p>
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
                  <span className="text-numeric text-sm font-semibold text-ink">{seg.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* Recepciones vs validadas + resumen operativo */}
      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
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
                <span className="text-numeric font-display text-title font-semibold text-ink">
                  {approvedPct}%
                </span>
              </div>
              <ProgressBar
                className="mt-2"
                value={approvedPct}
                tone={approvedPct >= 70 ? "green" : approvedPct >= 40 ? "wheat" : "earth"}
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                {reports.filter((r) => r.status === "APROBADO").length} de {reports.length} aprobados
              </p>
            </div>

            <div>
              <div className="flex items-end justify-between">
                <span className="text-sm text-ink-soft">Validación de recepciones</span>
                <span className="text-numeric font-display text-title font-semibold text-ink">
                  {validatedPct}%
                </span>
              </div>
              <ProgressBar
                className="mt-2"
                value={validatedPct}
                tone={validatedPct >= 70 ? "green" : validatedPct >= 40 ? "wheat" : "earth"}
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                {receptionStatus.validated} de {receptions.length} validadas
              </p>
            </div>

            <div className="border-t border-agro-border pt-4">
              <StatRow label="Clientes" value={String(clientCount)} />
            </div>
          </div>
        </Card>
      </section>

      {/* Estado de insumos + pendientes + módulos */}
      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Estado de insumos"
            subtitle="Stock disponible por cliente según recepciones validadas"
            action={
              <Link
                href="/dashboard/insumos"
                className="text-sm font-semibold text-agro-green-dark hover:underline"
              >
                Gestionar insumos
              </Link>
            }
          />
          <DataTable
            columns={stockColumns}
            data={stockRows}
            rowKey={(row) => row.id}
            loading={loading}
            skeletonRows={4}
            emptyState={
              <EmptyState
                icon={<InputsIcon />}
                title="Sin stock registrado"
                subtitle="Cuando se validen recepciones, el stock por cliente aparecerá acá."
              />
            }
          />
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden">
            <CardHeader
              title="Recepciones pendientes"
              subtitle="Esperando validación"
              action={<StatusBadge status="PENDIENTE_VALIDACION" map={RECEPTION_BADGE} />}
            />
            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">Cargando…</p>
            ) : pendingReceptions.length === 0 ? (
              <EmptyState
                icon={<InboxIcon />}
                title="Nada pendiente"
                subtitle="No hay recepciones esperando validación."
              />
            ) : (
              <ul className="divide-y divide-agro-border">
                {pendingReceptions.slice(0, 6).map((reception) => (
                  <li
                    key={reception.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {reception.clientName}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {fmtDate(reception.date)} · {reception.items.length}{" "}
                        {reception.items.length === 1 ? "insumo" : "insumos"}
                      </p>
                    </div>
                    <StatusBadge status={reception.status} map={RECEPTION_BADGE} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Módulos" subtitle="Accesos según tu rol" />
            <ul className="divide-y divide-agro-border">
              {visibleModules.map((module) => {
                const Icon = navIcon(module.icon);
                return (
                  <li key={module.label}>
                    <Link
                      href={module.href}
                      className="flex items-center gap-2.5 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-base-subtle"
                    >
                      <span className="text-ink-soft">
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                      </span>
                      {module.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </section>
    </DashboardLayout>
  );
}
