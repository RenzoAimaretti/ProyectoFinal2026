"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconTile,
  Modal,
  StatRow,
  type Tone,
} from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/form";
import { MachineTypeSelect } from "./MachineTypeSelect";
import { TableSkeleton } from "@/components/ui/skeleton";
import { MachineIcon, PlusIcon } from "@/components/ui/icons";
import { isAdminRole, navItems } from "@/components/ui/nav";
import { canManageFleet, legacyFieldHistory, machineTypeOptions, summarizeUsage } from "./metrics";
import {
  ApiError,
  apiGet,
  createMachine,
  deleteMaintenanceThreshold,
  getConsolidatedMachineReport,
  getStoredUser,
  listMachineActivities,
  listMachineAlerts,
  listMachineUsages,
  listMaintenanceThresholds,
  listTasks,
  saveMaintenanceThreshold,
  updateMachine,
  MACHINE_STATUS_LABELS,
  type MachineActivityDTO,
  type MachineAlertDTO,
  type MachineUsageDTO,
  type MaintenanceThresholdDTO,
  type ConsolidatedMachineReportDTO,
  type TaskDTO,
  type MachineDTO,
  type MachineStatus,
} from "@/api/client";

const STATUS_TONE: Record<MachineStatus, Tone> = {
  ACTIVA: "green",
  MANTENIMIENTO: "wheat",
  FUERA_SERVICIO: "earth",
};

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : dateFmt.format(d);
}

function fmtNumber(value: number): string {
  return value.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function fmtLiters(value: number): string {
  return `${fmtNumber(value)} L`;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    if (err.status === 400) return "Revisá los datos ingresados.";
    return `No se pudo completar la operación (código ${err.status}).`;
  }
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

type MachineSummary = {
  machine: MachineDTO;
  fuelLiters: number;
  usageHours: number;
  hectares: number;
  activityCount: number;
  lastActivityAt: string | null;
  lastServiceAt: string | null;
};

function latestDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (+new Date(a) >= +new Date(b) ? a : b));
}

function summarize(machine: MachineDTO, activities: MachineActivityDTO[], usages: MachineUsageDTO[]): MachineSummary {
  const own = activities.filter((a) => a.machineId === machine.id);
  const fuelLiters = own
    .filter((a) => a.type === "COMBUSTIBLE" && a.fuelMovement !== "CONSUMPTION" && typeof a.liters === "number")
    .reduce((sum, a) => sum + (a.liters as number), 0);
  const { usageHours, hectares } = summarizeUsage(machine.id, usages);
  const lastActivityAt = latestDate(own.map((a) => a.date));
  const lastServiceAt = latestDate(
    own
      .filter((a) => a.type === "MANTENIMIENTO" || a.type === "REPARACION")
      .map((a) => a.date),
  );

  return {
    machine,
    fuelLiters,
    usageHours,
    hectares,
    activityCount: own.length,
    lastActivityAt,
    lastServiceAt,
  };
}

export default function MaquinariaPage() {
  const { success, error: toastError } = useToast();

  const [machines, setMachines] = useState<MachineDTO[]>([]);
  const [activities, setActivities] = useState<MachineActivityDTO[]>([]);
  const [usages, setUsages] = useState<MachineUsageDTO[]>([]);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [alerts, setAlerts] = useState<MachineAlertDTO[]>([]);
  const [thresholds, setThresholds] = useState<MaintenanceThresholdDTO[]>([]);
  const [report, setReport] = useState<ConsolidatedMachineReportDTO | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const adminVisible = isAdmin && canManageFleet(getStoredUser()?.role);
  const typeOptions = useMemo(
    () => machineTypeOptions([...machines.map((m) => m.type), ...thresholds.map((t) => t.machineType)]),
    [machines, thresholds],
  );
  const [thresholdForm, setThresholdForm] = useState({ machineType: "", hoursLimit: "", hectaresLimit: "" });
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [typeEditing, setTypeEditing] = useState<string | null>(null);
  const [typeValue, setTypeValue] = useState("");
  const [thresholdFormKey, setThresholdFormKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", brand: "", type: "", entryDate: today() });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Read the persisted session (as on the dashboard) before issuing privileged requests.
      const admin = isAdminRole(getStoredUser()?.role);
      setIsAdmin(admin);
      const [machineData, activityData, usageData, taskData, alertData, thresholdData, reportData] = await Promise.all([
        apiGet<MachineDTO[]>("/machines"),
        listMachineActivities(),
        listMachineUsages(),
        listTasks(),
        listMachineAlerts(),
        admin ? listMaintenanceThresholds() : Promise.resolve([]),
        admin ? getConsolidatedMachineReport() : Promise.resolve(null),
      ]);
      setMachines(machineData);
      setActivities(activityData);
      setUsages(usageData);
      setTasks(taskData);
      setAlerts(alertData);
      setThresholds(thresholdData);
      setReport(reportData);
    } catch (err) {
      setLoadError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer the initial refresh so the effect does not synchronously update render state.
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const summaries = useMemo(
    () => machines.map((m) => summarize(m, activities, usages)),
    [machines, activities, usages],
  );

  const totalFuel = useMemo(
    () =>
      activities
        .filter((a) => a.type === "COMBUSTIBLE" && a.fuelMovement !== "CONSUMPTION" && typeof a.liters === "number")
        .reduce((sum, a) => sum + (a.liters as number), 0),
    [activities],
  );

  const openModal = useCallback(() => {
    setForm({ name: "", brand: "", type: "", entryDate: today() });
    setFormError(null);
    setModalOpen(true);
  }, []);

  const submitMachine = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitting) return;

      if (!form.name.trim()) {
        setFormError("Ingresá el nombre de la máquina.");
        return;
      }
      if (!form.brand.trim()) {
        setFormError("Ingresá la marca.");
        return;
      }
      if (!form.entryDate) {
        setFormError("Indicá la fecha de ingreso.");
        return;
      }

      setSubmitting(true);
      setFormError(null);
      try {
        await createMachine({
          name: form.name.trim(),
          brand: form.brand.trim(),
          type: form.type.trim() || null,
          entryDate: form.entryDate,
        });
        success("Máquina registrada.", "Maquinaria");
        setModalOpen(false);
        await load();
      } catch (err) {
        const message = describeError(err);
        setFormError(message);
        toastError(message, "No se pudo registrar");
      } finally {
        setSubmitting(false);
      }
    },
    [form, load, submitting, success, toastError],
  );

  const saveThreshold = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canManageFleet(getStoredUser()?.role)) return;
    const machineType = thresholdForm.machineType.trim();
    const hours = thresholdForm.hoursLimit.trim();
    const hectares = thresholdForm.hectaresLimit.trim();
    if (!machineType || (!hours && !hectares) ||
        (hours && (!Number.isFinite(Number(hours)) || Number(hours) <= 0)) ||
        (hectares && (!Number.isFinite(Number(hectares)) || Number(hectares) <= 0))) {
      toastError("Indicá un tipo y al menos un límite positivo.", "Umbrales");
      return;
    }
    setSavingThreshold(true);
    try {
      await saveMaintenanceThreshold(machineType, {
        ...(hours ? { hoursLimit: Number(hours) } : {}),
        ...(hectares ? { hectaresLimit: Number(hectares) } : {}),
      });
      success("Umbral guardado.", "Mantenimiento");
      setThresholdForm({ machineType: "", hoursLimit: "", hectaresLimit: "" });
      await load();
    } catch (err) { toastError(describeError(err), "No se pudo guardar el umbral"); }
    finally { setSavingThreshold(false); }
  };

  const removeThreshold = async (machineType: string) => {
    if (!canManageFleet(getStoredUser()?.role)) return;
    try {
      await deleteMaintenanceThreshold(machineType);
      success("Umbral eliminado.", "Mantenimiento");
      await load();
    } catch (err) { toastError(describeError(err), "No se pudo eliminar el umbral"); }
  };

  const saveType = async (machineId: string) => {
    if (!["ADMIN", "SUPERVISOR"].includes(getStoredUser()?.role || "")) return;
    try {
      await updateMachine(machineId, { type: typeValue.trim() || null });
      setTypeEditing(null);
      success("Tipo actualizado.", "Maquinaria");
      await load();
    } catch (err) { toastError(describeError(err), "No se pudo actualizar el tipo"); }
  };

  const taskLabel = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? `${task.laborTypeName || "Tarea"} · ${task.lotName || task.lotId} (${taskId.slice(0, 8)})` : `Tarea ${taskId}`;
  };

  return (
    <DashboardLayout
      title="Maquinaria"
      sidebarItems={navItems}
      breadcrumb="Flota, combustible y mantenimiento"
    >
      <section className="op-plate mb-5 flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="op-label">Flota, combustible y mantenimiento</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Maquinaria</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Control de la flota con combustible y mantenimiento por actividad, y uso acumulado por
            tarea.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            {loading ? (
              <div className="skeleton ml-auto h-8 w-14" aria-hidden="true" />
            ) : (
              <p className="op-num text-3xl font-bold leading-none text-ink">
                {machines.length}
              </p>
            )}
            <p className="op-label mt-1">Máquinas</p>
          </div>
          <button type="button" onClick={openModal} className="op-btn op-btn--primary">
            <PlusIcon className="h-4 w-4" />
            Registrar máquina
          </button>
        </div>
      </section>

      {loadError && (
        <Alert tone="error" title="No se pudo cargar la flota" className="mb-5">
          {loadError}
        </Alert>
      )}

      {loading ? (
        <Card className="overflow-hidden">
          <TableSkeleton rows={4} columns={3} />
        </Card>
      ) : summaries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MachineIcon />}
            title="Todavía no hay máquinas"
            subtitle="Registrá la primera máquina para empezar a seguir combustible y mantenimiento."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {summaries.map(({ machine, fuelLiters, usageHours, hectares, activityCount, lastActivityAt, lastServiceAt }) => (
            <Card key={machine.id} className="stagger-item overflow-hidden">
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="flex items-center gap-3">
                  <IconTile tone={STATUS_TONE[machine.status]}>
                    <MachineIcon />
                  </IconTile>
                  <div>
                    <h3 className="font-semibold text-ink">{machine.name}</h3>
                    <p className="text-sm text-ink-soft">{machine.brand ?? "Sin marca"} · {machine.type || "Sin tipo"}</p>
                    {typeEditing === machine.id ? (
                      <div className="flex flex-wrap items-end gap-2 pt-2">
                        <MachineTypeSelect
                          key={machine.id}
                          ariaLabel={`Tipo de ${machine.name}`}
                          value={typeValue}
                          onChange={setTypeValue}
                          options={typeOptions}
                          allowEmpty
                        />
                        <Button onClick={() => void saveType(machine.id)}>Guardar tipo</Button>
                        <Button variant="secondary" onClick={() => setTypeEditing(null)}>Cancelar</Button>
                      </div>
                    ) : (["ADMIN", "SUPERVISOR"].includes(getStoredUser()?.role || "") && <Button variant="secondary" onClick={() => { setTypeEditing(machine.id); setTypeValue(machine.type || ""); }}>Editar tipo</Button>)}
                  </div>
                </div>
                <Badge tone={STATUS_TONE[machine.status]}>
                  {MACHINE_STATUS_LABELS[machine.status]}
                </Badge>
              </div>

              <div className="border-t border-agro-border px-5 py-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Actividad registrada
                </p>
                {activityCount === 0 ? (
                  <p className="text-sm text-ink-soft">
                    Sin actividades cargadas para esta máquina.
                  </p>
                ) : (
                  <StatRow
                    label={`${activityCount} ${activityCount === 1 ? "actividad" : "actividades"}`}
                    value={`Última: ${fmtDate(lastActivityAt)}`}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-px border-t border-agro-border bg-agro-border lg:grid-cols-4">
                {[
                  {
                    k: "Combustible",
                    v: fuelLiters > 0 ? fmtLiters(fuelLiters) : "Sin registros",
                  },
                  {
                    k: "Horas de uso",
                    v: usageHours > 0 ? `${fmtNumber(usageHours)} h` : "Sin registros",
                  },
                  { k: "Hectáreas de uso", v: hectares > 0 ? `${fmtNumber(hectares)} ha` : "Sin registros" },
                  { k: "Último service", v: fmtDate(lastServiceAt) },
                ].map((d) => (
                  <div key={d.k} className="bg-card px-4 py-3">
                    <p className="op-label">{d.k}</p>
                    <p className="op-num text-sm font-semibold text-ink">{d.v}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !loadError && <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold">Uso por tarea</h2>
          <p className="mb-4 text-sm text-ink-soft">Cada registro aporta a las horas y hectáreas acumuladas de su máquina.</p>
          {usages.length === 0 ? <p className="text-sm text-ink-soft">Todavía no hay usos vinculados a tareas.</p> :
            <ul className="space-y-3">{usages.map(usage => <li key={usage.id} className="rounded-lg border border-agro-border p-3 text-sm">
              <p className="font-semibold">{machines.find(m => m.id === usage.machineId)?.name || usage.machineId} · {taskLabel(usage.taskId)}</p>
              <p className="text-ink-soft">Fecha de trabajo: {usage.workDate ? fmtDate(usage.workDate) : "Sin fecha registrada"} · {fmtNumber(usage.usageHours ?? 0)} h · {fmtNumber(usage.hectares ?? 0)} ha</p>
              <p className="text-ink-soft">Observaciones: {usage.observations || "Sin observaciones"}</p>
            </li>)}</ul>}
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold">Historial de uso anterior</h2>
          <p className="mb-4 text-sm text-ink-soft">Actividades USO_CAMPO heredadas: solo historial, no se suman al uso acumulado por tarea.</p>
          {legacyFieldHistory(activities).length === 0 ? <p className="text-sm text-ink-soft">Sin registros históricos de uso en campo.</p> :
            <ul className="space-y-2">{legacyFieldHistory(activities).map(activity => <li key={activity.id} className="border-b border-agro-border pb-2 text-sm">
              <strong>{machines.find(m => m.id === activity.machineId)?.name || activity.machineId}</strong> · {fmtDate(activity.date)} · {fmtNumber(activity.usageHours ?? 0)} h · {fmtNumber(activity.hectares ?? 0)} ha
              {activity.observations && <p>{activity.observations}</p>}
            </li>)}</ul>}
        </Card>
      </div>}

      {!loading && !loadError && <Card className="mt-5 p-5">
        <h2 className="font-display text-lg font-semibold">Alertas de mantenimiento</h2>
        {alerts.length === 0 || alerts.every(alert => alert.hoursLimit === null && alert.hectaresLimit === null) ?
          <p className="mt-3 text-sm text-ink-soft">No hay umbrales configurados para las máquinas de esta firma. No se generan alertas sin límites.</p> :
          alerts.filter(alert => alert.due).length === 0 ?
            <p className="mt-3 text-sm text-ink-soft">Ninguna máquina alcanzó sus límites configurados.</p> :
            <ul className="mt-3 space-y-2">{alerts.filter(alert => alert.due).map(alert => <li key={alert.id} className="rounded-lg border border-agro-border p-3 text-sm">
              <strong>{alert.name}</strong> ({alert.type || "Sin tipo"}) · {alert.reasons.map(reason => reason === "HOURS" ? "HORAS" : "HECTÁREAS").join(" y ")}
              <p>Horas: {fmtNumber(alert.usageHours)} h / límite {alert.hoursLimit === null ? "no configurado" : `${fmtNumber(alert.hoursLimit)} h`}</p>
              <p>Hectáreas: {fmtNumber(alert.hectares)} ha / límite {alert.hectaresLimit === null ? "no configurado" : `${fmtNumber(alert.hectaresLimit)} ha`}</p>
            </li>)}</ul>}
      </Card>}

      {!loading && !loadError && adminVisible && <Card className="mt-5 p-5">
        <h2 className="font-display text-lg font-semibold">Configurar umbrales por tipo de máquina</h2>
        <p className="text-sm text-ink-soft">Solo ADMIN. Indicá al menos un límite positivo; cada tipo tiene su propia configuración.</p>
        <form onSubmit={saveThreshold} className="mt-4 flex flex-wrap items-end gap-3">
          <MachineTypeSelect key={thresholdFormKey} required label="Tipo de máquina" value={thresholdForm.machineType} onChange={value => setThresholdForm(f => ({ ...f, machineType: value }))} options={typeOptions} disabled={savingThreshold} />
          <TextField label="Límite de horas" type="number" value={thresholdForm.hoursLimit} onChange={e => setThresholdForm(f => ({ ...f, hoursLimit: e.target.value }))} disabled={savingThreshold} />
          <TextField label="Límite de hectáreas" type="number" value={thresholdForm.hectaresLimit} onChange={e => setThresholdForm(f => ({ ...f, hectaresLimit: e.target.value }))} disabled={savingThreshold} />
          <Button type="submit" disabled={savingThreshold}>{savingThreshold ? "Guardando…" : "Guardar umbral"}</Button>
        </form>
        {thresholds.length === 0 ? <p className="mt-4 text-sm text-ink-soft">No hay umbrales configurados.</p> :
          <ul className="mt-4 space-y-2">{thresholds.map(threshold => <li key={threshold.machineType} className="flex flex-wrap items-center justify-between gap-2 border-b border-agro-border pb-2 text-sm">
            <span><strong>{threshold.machineType}</strong> · {threshold.hoursLimit === null ? "Sin límite de horas" : `${fmtNumber(threshold.hoursLimit)} h`} · {threshold.hectaresLimit === null ? "Sin límite de hectáreas" : `${fmtNumber(threshold.hectaresLimit)} ha`}</span>
            <span className="flex gap-2"><Button variant="secondary" onClick={() => { setThresholdForm({ machineType: threshold.machineType, hoursLimit: threshold.hoursLimit?.toString() || "", hectaresLimit: threshold.hectaresLimit?.toString() || "" }); setThresholdFormKey((k) => k + 1); }}>Editar</Button>
            <Button variant="secondary" onClick={() => void removeThreshold(threshold.machineType)}>Eliminar</Button></span>
          </li>)}</ul>}
      </Card>}

      {!loading && !loadError && adminVisible && report && <Card className="mt-5 overflow-hidden p-5">
        <h2 className="font-display text-lg font-semibold">Consolidado por firma</h2>
        {report.rows.length === 0 ? <p className="mt-3 text-sm text-ink-soft">No hay firmas asociadas para mostrar.</p> :
          <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b border-agro-border"><th className="p-2">Firma</th><th className="p-2">Comprado</th><th className="p-2">Consumido</th><th className="p-2">Saldo</th><th className="p-2">Horas</th><th className="p-2">Hectáreas</th><th className="p-2">Mantenimiento</th><th className="p-2">Reparación</th></tr></thead>
            <tbody>{report.rows.map(row => <tr key={row.companyId} className="border-b border-agro-border"><th className="p-2">{row.companyName}</th>{metricCells(row)}</tr>)}</tbody>
            <tfoot><tr className="font-semibold"><th className="p-2">Total</th>{metricCells(report.totals)}</tr></tfoot>
          </table></div>}
      </Card>}

      {/* Pie: resumen real de combustible */}
      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-6 p-5">
          <div className="flex items-center gap-3">
            <IconTile tone="wheat">
              <MachineIcon />
            </IconTile>
            <div>
              <p className="op-num text-base font-bold text-ink">
                {totalFuel > 0 ? fmtLiters(totalFuel) : "Sin registros"}
              </p>
              <p className="op-caption">Combustible total cargado</p>
            </div>
          </div>
          <div className="h-10 w-px bg-agro-border" />
          <p className="max-w-md text-sm text-ink-soft">
            Suma de las actividades de tipo combustible registradas por la firma. El detalle
            por comprobante y costo se consulta en el módulo de Insumos.
          </p>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => (submitting ? undefined : setModalOpen(false))}
        title="Registrar máquina"
        subtitle="El alta queda asociada a la firma de tu sesión."
      >
        <form className="space-y-4" onSubmit={submitMachine}>
          <TextField
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Tractor John Deere 6110"
            disabled={submitting}
          />
          <TextField
            label="Marca"
            required
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            placeholder="Ej: John Deere"
            disabled={submitting}
          />
          <MachineTypeSelect
            label="Tipo de máquina"
            value={form.type}
            onChange={(value) => setForm((f) => ({ ...f, type: value }))}
            options={typeOptions}
            allowEmpty
            disabled={submitting}
          />
          <TextField
            label="Fecha de ingreso"
            type="date"
            required
            value={form.entryDate}
            onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
            disabled={submitting}
          />
          <SelectField
            label="Estado"
            value="ACTIVA"
            options={[{ value: "ACTIVA", label: MACHINE_STATUS_LABELS.ACTIVA }]}
            disabled
            title="El backend crea la máquina como Activa; el estado se actualiza luego."
            hint="El alta se registra como Activa. El backend no permite definir otro estado al crear."
          />

          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Registrando…" : "Registrar máquina"}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

function metricCells(row: NonNullable<ConsolidatedMachineReportDTO>["totals"]) {
  return <>
    <td className="p-2">{fmtLiters(row.fuelPurchasedLiters)}</td>
    <td className="p-2">{fmtLiters(row.fuelConsumedLiters)}</td>
    <td className="p-2">{fmtLiters(row.fuelBalanceLiters)}</td>
    <td className="p-2">{fmtNumber(row.usageHours)} h</td>
    <td className="p-2">{fmtNumber(row.hectares)} ha</td>
    <td className="p-2">$ {fmtNumber(row.maintenanceCost)}</td>
    <td className="p-2">$ {fmtNumber(row.repairCost)}</td>
  </>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
