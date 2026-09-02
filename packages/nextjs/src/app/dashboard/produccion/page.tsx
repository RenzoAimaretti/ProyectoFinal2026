"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import { Card, Badge, IconTile, Button, HeroBand, type Tone } from "@/components/ui/primitives";
import { navItems } from "@/components/ui/nav";
import { useRol } from "@/components/ui/rol";
import { apiGet, type FarmDTO, type LotDTO, type TaskDTO, type TaskTypeDTO } from "@/api/client";

type Estado = "done" | "current" | "next";
type Tarea = { id: string; hora: string; tarea: string; cliente: string; lote: string; detalle: string; estado: Estado };

const estadoMap: Record<TaskDTO["status"], Estado> = {
  FINALIZADA: "done",
  EN_PROGRESO: "current",
  PENDIENTE: "next",
  CANCELADA: "next",
};

function horaLocal(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function jornadaDesdeApi(
  tasks: TaskDTO[],
  lots: LotDTO[],
  taskTypes: TaskTypeDTO[],
  farms: FarmDTO[],
): Tarea[] {
  const lotById = new Map(lots.map((l) => [l.id, l]));
  const ttById = new Map(taskTypes.map((t) => [t.id, t]));
  const farmById = new Map(farms.map((f) => [f.id, f]));
  const pts = new Date().setHours(0, 0, 0, 0);
  const hoy = new Date(pts).toISOString().slice(0, 10);

  return tasks
    .filter((t) => t.startedAt && t.startedAt.slice(0, 10) === hoy)
    .map((t) => {
      const lot = lotById.get(t.lotId);
      const tt = ttById.get(t.taskTypeId);
      const farm = lot ? farmById.get(lot.farmId) : undefined;
      const area = lot ? ` ${lot.area} ha ·` : "";
      return {
        id: t.id,
        hora: horaLocal(t.startedAt),
        tarea: tt?.name ?? "Labor",
        cliente: farm?.name ?? "—",
        lote: lot?.name ?? "—",
        detalle: `${area} ${tt?.description ?? ""}`.trim(),
        estado: estadoMap[t.status],
      };
    })
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

const CLIENTE_LOGUEADO = "Agro-Sur";

const estadoBadge: Record<Estado, { label: string; tone: Tone }> = {
  done: { label: "Completado", tone: "green" },
  current: { label: "En curso", tone: "wheat" },
  next: { label: "Programado", tone: "slate" },
};

export default function ProduccionPage() {
  const { rol } = useRol();
  const esAdmin = rol !== "cliente";
  const [jornada, setJornada] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<TaskDTO[]>("/tasks"),
      apiGet<LotDTO[]>("/lots"),
      apiGet<TaskTypeDTO[]>("/task-types"),
      apiGet<FarmDTO[]>("/farms"),
    ])
      .then(([tasks, lots, taskTypes, farms]) => {
        if (alive) setJornada(jornadaDesdeApi(tasks, lots, taskTypes, farms));
      })
      .catch((e) => { if (alive) console.error("No se pudo cargar Producción:", e); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const labores = esAdmin ? jornada : jornada.filter((t) => t.cliente === CLIENTE_LOGUEADO);
  const enCurso = labores.filter((t) => t.estado === "current").length;
  const completado = labores.filter((t) => t.estado === "done").length;
  const haEnCurso = labores.filter((t) => t.estado === "current").reduce(
    (a, t) => a + (parseInt(t.detalle.split("·")[0].trim()) || 0), 0);

  return (
    <DashboardLayout
      title="Producción"
      sidebarItems={navItems}
      breadcrumb="Labores agrícolas y partes diarios"
    >
      <HeroBand
        kicker={esAdmin ? "Labores en curso" : "Avance de tus lotes"}
        title="Producción"
        description={
          esAdmin
            ? "Parte diario de la jornada de todas las firmas, recetas de aplicación y condiciones por labor."
            : "Estado de las labores sobre tus lotes: qué se está haciendo, cuánto avanzó y qué viene."
        }
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75z" />
          </svg>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">{enCurso} en curso</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">{completado} completadas</span>
            {esAdmin && (
              <Button className="!bg-white/95 !text-agro-green-deep !hover:bg-white">+ Cargar parte</Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Timeline de la jornada */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-agro-border px-5 py-4">
              <div>
                <h3 className="font-semibold text-ink">Jornada de hoy</h3>
                <p className="text-sm text-ink-soft">Miércoles, 02 set — {completado} partes {esAdmin ? "de todas las firmas" : "sobre tus lotes"}</p>
              </div>
              <Badge tone="wheat">{haEnCurso} ha en curso</Badge>
            </div>

            <ol className="relative px-5 py-4">
              <div className="absolute bottom-0 left-[2.7rem] top-0 w-px bg-agro-border" />
              {labores.map((ev) => {
                const eb = estadoBadge[ev.estado];
if (loading) {
    return (
      <DashboardLayout title="Producción" sidebarItems={navItems} breadcrumb="Labores agrícolas y partes diarios">
        <Card className="p-8 text-center text-ink-soft">Cargando jornada…</Card>
      </DashboardLayout>
    );
  }

  return (
                  <li key={ev.id} className="relative z-10 mb-5 flex gap-4">
                    <div className="w-12 shrink-0 pt-0.5 text-xs font-medium text-ink-faint">{ev.hora}</div>
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        ev.estado === "done" ? "bg-agro-green" : ev.estado === "current" ? "bg-agro-wheat animate-pulse-soft" : "bg-ink-faint"
                      }`}
                    />
                    <div className="min-w-0 flex-1 rounded-lg border border-agro-border bg-card px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-ink">{ev.tarea}</p>
                          <p className="text-xs text-ink-soft">
                            {ev.lote}
                            {esAdmin && ev.cliente !== "—" && (
                              <span className="ml-1 rounded bg-agro-green/5 px-1.5 py-0.5 text-[11px] font-medium text-agro-green-deep ring-1 ring-agro-border">{ev.cliente}</span>
                            )}
                          </p>
                        </div>
                        <Badge tone={eb.tone}>{eb.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-faint">{ev.detalle}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {/* Receta + condiciones */}
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-agro-border px-5 py-4">
              <h3 className="font-semibold text-ink">Receta de aplicación</h3>
              <p className="text-sm text-ink-soft">Cargada por el Ing. Agrónomo</p>
            </div>
            <div className="space-y-3 p-5">
              <RecetaRow k="Dosis" v="2,5 L/ha" />
              <RecetaRow k="Caldo" v="180 L/ha" />
              <RecetaRow k="Orden de carga" v="Agua → Herbicida → Adyuvante" />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-agro-border px-5 py-4">
              <h3 className="font-semibold text-ink">Condiciones de aplicación</h3>
            </div>
            <div className="space-y-3 p-5">
              <RecetaRow k="Viento" v="9 N · SO" />
              <RecetaRow k="Temperatura" v="24 °C" />
              <RecetaRow k="Hum. relativa" v="58 %" />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function RecetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-agro-border pb-2 text-sm last:border-0 last:pb-0">
      <span className="text-ink-soft">{k}</span>
      <span className="font-semibold text-ink">{v}</span>
    </div>
  );
}