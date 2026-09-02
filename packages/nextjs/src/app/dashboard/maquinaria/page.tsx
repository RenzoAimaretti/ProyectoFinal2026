import { DashboardLayout } from "@/components/ui/layout";
import { Card, Badge, IconTile, Button, StatRow, ProgressBar, HeroBand, type Tone } from "@/components/ui/primitives";
import { navItems } from "@/components/ui/nav";
import { apiGet, type MachineDTO } from "@/api/client";

// Estado back -> presentación. "peatón" no modelado: horas/umbral/combustible/ubi
const estadoToPres: Record<MachineDTO["status"], "ok" | "avisa" | "alerta"> = {
  ACTIVA: "ok",
  MANTENIMIENTO: "alerta",
  FUERA_SERVICIO: "alerta",
};

const estadoMeta: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "En rango", tone: "green" },
  avisa: { label: "Preventivo próximo", tone: "wheat" },
  alerta: { label: "Requiere atención", tone: "earth" },
};

export default async function MaquinariaPage() {
  const maquinas = await apiGet<MachineDTO[]>("/machines");
  // Horas de uso no modeladas: exponemos un progreso derivado del estado para la barra
  const flota = maquinas.map((m) => {
    const estado = estadoToPres[m.status];
    const pct = estado === "ok" ? 40 : estado === "avisa" ? 78 : 100;
    return {
      nombre: m.name,
      tipo: m.brand ?? "Maquinaria",
      horas: null as number | null,
      umbral: null as number | null,
      combustible: "—",
      ubi: m.status === "MANTENIMIENTO" ? "En taller" : "En campo",
      estado,
      pct,
    };
  });
  return (
    <DashboardLayout
      title="Maquinaria"
      sidebarItems={navItems}
      breadcrumb="Flota, combustible y mantenimiento"
    >
      <HeroBand
        kicker="Flota, combustible y mantenimiento"
        title="Maquinaria"
        description="Control de horas por máquina con umbral de mantenimiento preventivo y consumo de combustible."
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">{flota.length} máquinas</span>
            <Button className="!bg-white/95 !text-agro-green-deep !hover:bg-white">+ Registrar máquina</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {flota.map((m) => {
          const s = estadoMeta[m.estado];
          return (
            <Card key={m.nombre} className="stagger-item overflow-hidden">
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="flex items-center gap-3">
                  <IconTile tone={s.tone}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877" /></svg>
                  </IconTile>
                  <div>
                    <h3 className="font-semibold text-ink">{m.nombre}</h3>
                    <p className="text-sm text-ink-soft">{m.tipo} · {m.ubi}</p>
                  </div>
                </div>
                <Badge tone={s.tone}>{s.label}</Badge>
              </div>

              {/* Gauge de horas vs umbral de mantenimiento */}
              <div className="border-t border-agro-border px-5 py-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-ink-soft">Estado general</span>
                  <span className="font-semibold text-ink">{m.estado === "ok" ? "En operación" : "Requiere atención"}</span>
                </div>
                <ProgressBar value={m.pct} tone={s.tone} />
              </div>

              <div className="grid grid-cols-3 gap-px border-t border-agro-border bg-agro-border">
                {[
                  { k: "Tipo", v: m.tipo },
                  { k: "Ubicación", v: m.ubi },
                  { k: "Última revisión", v: m.estado === "ok" ? "Hace 2 sem" : "En curso" },
                ].map((d) => (
                  <div key={d.k} className="bg-card px-4 py-3">
                    <p className="text-[11px] text-ink-faint">{d.k}</p>
                    <p className="text-sm font-semibold text-ink">{d.v}</p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pie: resumen de combustible */}
      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-6 p-5">
          <div className="flex items-center gap-3">
            <IconTile tone="wheat">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 8.25h3.75a4.5 4.5 0 014.5 4.5v7.5" /></svg>
            </IconTile>
            <div>
              <p className="text-base font-bold text-ink">42.000 L</p>
              <p className="text-xs text-ink-faint">Combustible en campaña</p>
            </div>
          </div>
          <div className="h-10 w-px bg-agro-border" />
          <p className="max-w-md text-sm text-ink-soft">
            Compras registradas con comprobantes y <b className="text-ink">costos discriminados por firma</b> (Eliggi y Eliggi Néstor) para no mezclar unidades de negocio.
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}