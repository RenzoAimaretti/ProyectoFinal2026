import { DashboardLayout } from "@/components/ui/layout";
import { Card, Badge, IconTile, Button, StatRow, ProgressBar, HeroBand, type Tone } from "@/components/ui/primitives";
import { navItems } from "@/components/ui/nav";
import { apiGet, type LivestockDTO, type LivestockEventDTO, type WeightRecordDTO } from "@/api/client";

const eventTone: Record<string, Tone> = {
  VACUNACION: "green",
  TRATAMIENTO: "earth",
  CASTRACION: "slate",
  INSEMINACION: "wheat",
  PARTO: "slate",
  ENFERMEDAD: "earth",
};
const eventLabel: Record<string, string> = {
  VACUNACION: "Vacunación",
  TRATAMIENTO: "Sanitario",
  CASTRACION: "Castración",
  INSEMINACION: "Inseminación",
  PARTO: "Parto",
  ENFERMEDAD: "Enfermedad",
};

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return `Hoy · ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function GanaderoPage() {
  const [livestocks, events, weights] = await Promise.all([
    apiGet<LivestockDTO[]>("/livestocks"),
    apiGet<LivestockEventDTO[]>("/livestock-events"),
    apiGet<WeightRecordDTO[]>("/weight-records"),
  ]);

  // Caravanas recientes: la actividad más reciente de cada animal
  const ultimoEvento = (id: string): LivestockEventDTO | undefined =>
    events.filter((e) => e.livestockId === id).sort((a, b) => +new Date(b.eventDate) - +new Date(a.eventDate))[0];
  const caravanas = livestocks.map((l) => ({
    id: l.tagNumber,
    ult: ultimoEvento(l.id) ? eventLabel[ultimoEvento(l.id)!.type] ?? "Actividad" : "Sin eventos",
  }));

  // Activo de la ficha: el animal con más historia clínica
  const activo = [...livestocks].sort(
    (a, b) => events.filter((e) => e.livestockId === b.id).length - events.filter((e) => e.livestockId === a.id).length,
  )[0];
  const eventosActivo = events
    .filter((e) => e.livestockId === activo.id)
    .sort((a, b) => +new Date(b.eventDate) - +new Date(a.eventDate))
    .map((e) => ({
      fecha: fechaCorta(e.eventDate),
      tipo: eventLabel[e.type] ?? e.type,
      detalle: e.observations ?? "Sin detalle",
      tone: eventTone[e.type] ?? "slate",
    }));

  const pesos = weights
    .filter((w) => w.livestockId === activo.id)
    .sort((a, b) => +new Date(a.measuredAt) - +new Date(b.measuredAt));
  const pesoActual = pesos[pesos.length - 1]?.weight;
  const pesoInicial = pesos[0]?.weight;
  const ganancia = pesos.length >= 2
    ? `+${((pesoActual! - pesoInicial!) / Math.max(1, (new Date(pesos[pesos.length - 1].measuredAt).getTime() - new Date(pesos[0].measuredAt).getTime()) / 86400000)).toFixed(1)} kg/día`
    : "—";
  const pctPeso = pesoInicial && pesoActual
    ? Math.min(100, Math.round(((pesoActual - pesoInicial) / 100) * 100))
    : 0;

  return (
    <DashboardLayout
      title="Ganadería"
      sidebarItems={navItems}
      breadcrumb="Ganadero de precisión · RFID"
    >
      <HeroBand
        kicker="Ganadería de precisión · RFID"
        title="Ganadería"
        description="Ficha clínica y productiva de cada animal por caravana: biometría, peso y trazabilidad sanitaria."
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.795.5-3 1.5-3.5M3.75 13.5h16.5M12 7.5l-1.5 3m-5.25-1.5c0 4.739 2.844 8.25 6.75 8.25s6.75-3.511 6.75-8.25" />
          </svg>
        }
        actions={
          <Button className="!bg-white/95 !text-agro-green-deep !hover:bg-white">
            Escanear caravana
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Buscador de caravana / lista */}
        <aside className="lg:col-span-1">
          <Card className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-lg bg-base-subtle px-3 py-2.5">
                <svg className="h-4 w-4 shrink-0 text-agro-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m3.75 7.5a5.25 5.25 0 010-7.5m1.5.75a5.25 5.25 0 010 7.5M4.5 15a8.25 8.25 0 010-6" /></svg>
                <input
                  placeholder="Leer o escribir caravana RFID"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
              </div>
              <button className="mt-2 w-full rounded-lg bg-agro-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-agro-green-dark">
                Leer caravana
              </button>
            </div>

            <div className="border-t border-agro-border px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Últimas caravanas</p>
                <Badge tone="slate">el día</Badge>
              </div>
            </div>
            <ul className="divide-y divide-agro-border">
              {caravanas.map((c) => (
                <li key={c.id} className="stagger-item">
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-base-subtle">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-agro-green/15">
                      <span className="text-[11px] font-semibold text-agro-green-deep">TC</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{c.id}</p>
                      <p className="text-xs text-ink-faint">{c.ult}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        {/* Ficha del paciente */}
        <section className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
              <div className="flex items-center gap-3">
                <IconTile tone="green">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m3.75 7.5a5.25 5.25 0 010-7.5" /></svg>
                </IconTile>
                <div>
                  <h3 className="font-semibold text-ink">Caravana {activo.tagNumber}</h3>
                  <p className="text-sm text-ink-soft">Identificada por RFID · sin margen de error</p>
                </div>
              </div>
              <Badge tone="green">{activo.status}</Badge>
            </div>

            {/* Datos biometricos */}
            <div className="grid grid-cols-2 gap-px border-b border-agro-border bg-agro-border lg:grid-cols-4">
              {[
                { k: "Peso actual", v: pesoActual ? `${pesoActual} kg` : "—" },
                { k: "Ganancia", v: ganancia },
                { k: "Raza", v: activo.breed ?? "—" },
                { k: "Categoría", v: `${activo.species} · ${activo.sex}` },
              ].map((d) => (
                <div key={d.k} className="bg-card px-5 py-3.5">
                  <p className="text-xs text-ink-faint">{d.k}</p>
                  <p className="text-base font-bold text-ink">{d.v}</p>
                </div>
              ))}
            </div>

            {/* Timeline clinico */}
            <div className="px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Historial clínico</p>
                <Button className="!py-1.5 !text-xs">+ Evento sanitario</Button>
              </div>

              <ol className="relative space-y-5 pl-5">
                <div className="absolute bottom-1 left-[0.45rem] top-1 w-px bg-agro-border" />
                {eventosActivo.map((ev, i) => (
                  <li key={`${ev.fecha}-${i}`} className="relative">
                    <span className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ${
                      ev.tone === "slate" ? "bg-ink-faint" : ev.tone === "green" ? "bg-agro-green" : ev.tone === "wheat" ? "bg-agro-wheat" : "bg-agro-earth"
                    }`} />
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-ink">{ev.tipo}</p>
                      <span className="text-xs text-ink-faint">{ev.fecha}</span>
                    </div>
                    <p className="text-sm text-ink-soft">{ev.detalle}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          {/* Objetivo de peso */}
          <Card className="mt-5 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Meta de desarrollo</p>
              <span className="text-sm font-bold text-agro-green-dark">{pctPeso} %</span>
            </div>
            <ProgressBar value={pctPeso} tone="green" className="mt-2.5" />
            <div className="mt-2 flex justify-between text-xs text-ink-soft">
              <span>Peso inicial {pesoInicial ?? "—"} kg</span>
              <span>Último peso {pesoActual ?? "—"} kg</span>
            </div>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}