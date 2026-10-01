"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Card,
  EmptyState,
  HeroBand,
  KpiCard,
  ProgressBar,
  StatRow,
  StatusBadge,
  type StatusMap,
} from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import { DataTable, type DataTableColumn } from "@/components/ui/table";
import { navItems, modulesForRole, navIcon } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
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
  apiGet,
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

function fmtDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : dateFmt.format(d);
}

function startOfWeek(): number {
  const d = new Date();
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - mondayOffset);
  return d.getTime();
}

function isThisWeek(value: string): boolean {
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.getTime() >= startOfWeek();
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reports, setReports] = useState<DailyReportDTO[]>([]);
  const [receptions, setReceptions] = useState<ReceptionDTO[]>([]);
  const [machines, setMachines] = useState<MachineDTO[]>([]);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
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
  }, [version]);

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

  const weekReports = useMemo(() => reports.filter((r) => isThisWeek(r.date)), [reports]);
  const weekHectares = useMemo(
    () => weekReports.reduce((acc, r) => acc + (r.hectares ?? 0), 0),
    [weekReports],
  );
  const weekHours = useMemo(
    () => weekReports.reduce((acc, r) => acc + (r.hours ?? 0), 0),
    [weekReports],
  );

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

  const visibleModules = modulesForRole(navItems, user?.role);

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

  return (
    <DashboardLayout
      title="Vista general"
      sidebarItems={navItems}
      breadcrumb="Panel principal"
    >
      <HeroBand
        kicker="Panel principal"
        title="Vista general"
        description="Resumen de la operación de la campaña."
        icon={<DashboardIcon className="h-6 w-6" />}
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

      {/* KPIs reales */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Partes pendientes"
          value={pendingReports.length}
          hint="Por aprobar"
          tone="wheat"
          icon={<InboxIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Recepciones pendientes"
          value={pendingReceptions.length}
          hint="Por validar"
          tone="earth"
          icon={<InputsIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Máquinas activas"
          value={activeMachines.length}
          hint={`de ${machines.length} registradas`}
          tone="green"
          icon={<MachineIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Tareas en progreso"
          value={tasksInProgress.length}
          hint="Labores en curso"
          tone="slate"
          icon={<ProductionIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Hectáreas esta semana"
          value={`${numberFmt.format(weekHectares)} ha`}
          hint="Según partes cargados"
          tone="green"
          icon={<FieldIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Horas esta semana"
          value={`${numberFmt.format(weekHours)} hs`}
          hint="Según partes cargados"
          tone="slate"
          icon={<DashboardIcon className="h-5 w-5" />}
        />
      </section>

      {/* Resumen de gestión */}
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-semibold text-ink">Aprobación de partes</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            {reports.length} partes en total
          </p>
          <div className="mt-4 space-y-3">
            <StatRow label="Aprobados" value={`${approvedPct}%`} />
            <ProgressBar
              value={approvedPct}
              tone={approvedPct >= 70 ? "green" : approvedPct >= 40 ? "wheat" : "earth"}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink">Validación de recepciones</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            {receptions.length} recepciones registradas
          </p>
          <div className="mt-4 space-y-3">
            <StatRow label="Validadas" value={`${validatedPct}%`} />
            <ProgressBar
              value={validatedPct}
              tone={validatedPct >= 70 ? "green" : validatedPct >= 40 ? "wheat" : "earth"}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink">Módulos</h3>
          <p className="mt-0.5 text-sm text-ink-soft">Accesos según tu rol</p>
          <ul className="mt-4 space-y-2">
            {visibleModules.map((module) => {
              const Icon = navIcon(module.icon);
              return (
                <li key={module.label}>
                  <Link
                    href={module.href}
                    className="flex items-center gap-2.5 rounded-lg border border-agro-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-base-subtle"
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
      </section>

      {/* Estado de insumos (stock real por cliente) */}
      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
            <div>
              <h3 className="font-semibold text-ink">Estado de insumos</h3>
              <p className="text-sm text-ink-soft">
                Stock disponible por cliente según recepciones validadas.
              </p>
            </div>
            <Link
              href="/dashboard/insumos"
              className="text-sm font-semibold text-agro-green-dark hover:underline"
            >
              Gestionar insumos
            </Link>
          </div>
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

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
            <div>
              <h3 className="font-semibold text-ink">Recepciones pendientes</h3>
              <p className="text-sm text-ink-soft">Esperando validación</p>
            </div>
            <StatusBadge status="PENDIENTE_VALIDACION" map={RECEPTION_BADGE} />
          </div>
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
      </section>
    </DashboardLayout>
  );
}
