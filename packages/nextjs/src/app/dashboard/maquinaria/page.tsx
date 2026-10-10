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
import { TableSkeleton } from "@/components/ui/skeleton";
import { MachineIcon, PlusIcon } from "@/components/ui/icons";
import { navItems } from "@/components/ui/nav";
import {
  ApiError,
  apiGet,
  createMachine,
  listMachineActivities,
  MACHINE_STATUS_LABELS,
  type MachineActivityDTO,
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
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : dateFmt.format(d);
}

function fmtLiters(value: number): string {
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })} L`;
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
  activityCount: number;
  lastActivityAt: string | null;
  lastServiceAt: string | null;
};

function latestDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (+new Date(a) >= +new Date(b) ? a : b));
}

function summarize(machine: MachineDTO, activities: MachineActivityDTO[]): MachineSummary {
  const own = activities.filter((a) => a.machineId === machine.id);
  const fuelLiters = own
    .filter((a) => a.type === "COMBUSTIBLE" && typeof a.liters === "number")
    .reduce((sum, a) => sum + (a.liters as number), 0);
  const usageHours = own
    .filter((a) => typeof a.usageHours === "number")
    .reduce((sum, a) => sum + (a.usageHours as number), 0);
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
    activityCount: own.length,
    lastActivityAt,
    lastServiceAt,
  };
}

export default function MaquinariaPage() {
  const { success, error: toastError } = useToast();

  const [machines, setMachines] = useState<MachineDTO[]>([]);
  const [activities, setActivities] = useState<MachineActivityDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", brand: "", entryDate: today() });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchFleet = useCallback(async () => {
    const [machineData, activityData] = await Promise.all([
      apiGet<MachineDTO[]>("/machines"),
      listMachineActivities(),
    ]);
    return { machineData, activityData };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { machineData, activityData } = await fetchFleet();
      setMachines(machineData);
      setActivities(activityData);
    } catch (err) {
      setLoadError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [fetchFleet]);

  useEffect(() => {
    // Initial load. State is only written after the await, so the effect does
    // not trigger synchronous cascading renders.
    let alive = true;
    fetchFleet()
      .then(({ machineData, activityData }) => {
        if (!alive) return;
        setMachines(machineData);
        setActivities(activityData);
      })
      .catch((err) => {
        if (alive) setLoadError(describeError(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fetchFleet]);

  const summaries = useMemo(
    () => machines.map((m) => summarize(m, activities)),
    [machines, activities],
  );

  const totalFuel = useMemo(
    () =>
      activities
        .filter((a) => a.type === "COMBUSTIBLE" && typeof a.liters === "number")
        .reduce((sum, a) => sum + (a.liters as number), 0),
    [activities],
  );

  const openModal = useCallback(() => {
    setForm({ name: "", brand: "", entryDate: today() });
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
            Control de la flota con combustible, horas de uso y mantenimiento registrados por
            actividad.
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
          {summaries.map(({ machine, fuelLiters, usageHours, activityCount, lastActivityAt, lastServiceAt }) => (
            <Card key={machine.id} className="stagger-item overflow-hidden">
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="flex items-center gap-3">
                  <IconTile tone={STATUS_TONE[machine.status]}>
                    <MachineIcon />
                  </IconTile>
                  <div>
                    <h3 className="font-semibold text-ink">{machine.name}</h3>
                    <p className="text-sm text-ink-soft">{machine.brand ?? "Sin marca"}</p>
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
                    v: usageHours > 0 ? `${usageHours.toLocaleString("es-AR")} h` : "Sin registros",
                  },
                  { k: "Última actividad", v: fmtDate(lastActivityAt) },
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
