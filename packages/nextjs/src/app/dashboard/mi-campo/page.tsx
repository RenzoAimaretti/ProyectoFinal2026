"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import { Card, Badge, IconTile } from "@/components/ui/primitives";
import { navItems } from "@/components/ui/nav";
import { useRol } from "@/components/ui/rol";
import { SatelliteMap, Sparkline, Donut, WindRose } from "@/components/ui/charts";
import { apiGet, type FarmDTO, type LotDTO } from "@/api/client";

type Est = "libre" | "sembrado" | "aplicado" | "cosechado";

const estadoMeta: Record<Est, { label: string; block: string; dot: string }> = {
  sembrado: { label: "Sembrado", block: "bg-agro-green/25 ring-agro-green/40", dot: "bg-agro-olive" },
  aplicado: { label: "Aplicado", block: "bg-agro-ochre/25 ring-agro-ochre/50", dot: "bg-agro-ochre" },
  cosechado: { label: "Cosechado", block: "bg-agro-earth/25 ring-agro-earth/40", dot: "bg-agro-earth" },
  libre: { label: "Libre", block: "bg-slate-300/40 ring-slate-400/40", dot: "bg-slate-400" },
};

// Fases del lote (stepper): Siembra → Aplicación → Crecimiento → Cosecha
const fases = [
  { etapa: "Siembra", fecha: "02/09" },
  { etapa: "Aplicación", fecha: "18/09" },
  { etapa: "Crecimiento", fecha: "12/10" },
  { etapa: "Cosecha", fecha: "Ene '27" },
];

type Lote = {
  id: string;
  name: string;
  cultivo: string;
  ha: number;
  est: Est;
  rot: string[];
  fase: number;
  ndvi: number;
  humedad: number;
  sentido: number[];
};

// Campos agronómicos derivados no modelados en el backend: se asignan por índice
// para mantener la riqueza visual, mientras identidad, nombre y hectáreas vienen de la API.
const CULTIVOS = ["Trigo", "Maíz", "Soja"];
const ESTADOS: Est[] = ["sembrado", "aplicado", "cosechado", "libre"];
const ROTACIONES: string[][] = [
  ["Barbecho 24/25", "Soja 23/24"],
  ["Trigo 24/25", "Soja 23/24", "Maíz 22/23"],
  ["Maíz 24/25", "Trigo 23/24"],
  ["Soja 24/25", "Maíz 23/24"],
];
const NDVI = [0.42, 0.58, 0.35, 0.4, 0.18, 0.55, 0.45];
const HUMEDAD = [55, 58, 40, 52, 38, 54, 51];
const SENTIDO: number[][] = [
  [38, 41, 45, 43, 47],
  [60, 56, 63, 61, 67],
  [70, 72, 69, 74, 76],
  [40, 42, 44, 45, 47],
  [20, 20, 20, 20, 20],
  [58, 60, 57, 62, 64],
  [39, 42, 40, 44, 46],
];

function lotesDesdeApi(farms: FarmDTO[], lots: LotDTO[]): Record<string, Lote[]> {
  const out: Record<string, Lote[]> = {};
  farms.forEach((f, fIdx) => {
    out[f.name] = lots
      .filter((l) => l.farmId === f.id)
      .map((l, i) => {
        const idx = (fIdx * 3 + i) % 7;
        return {
          id: l.id,
          name: l.name,
          cultivo: CULTIVOS[idx % CULTIVOS.length],
          ha: l.area,
          est: ESTADOS[i % ESTADOS.length],
          rot: ROTACIONES[i % ROTACIONES.length],
          fase: i % 4,
          ndvi: NDVI[idx],
          humedad: HUMEDAD[idx],
          sentido: SENTIDO[idx],
        };
      });
  });
  return out;
}

const CLIENTE_LOGUEADO = "Agro-Sur";

export default function MiCampoPage() {
  const { rol } = useRol();
  const [campos, setCampos] = useState<Record<string, Lote[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([apiGet<FarmDTO[]>("/farms"), apiGet<LotDTO[]>("/lots")])
      .then(([farms, lots]) => {
        if (!alive) return;
        const c = lotesDesdeApi(farms, lots);
        const inicial = rol === "cliente" ? CLIENTE_LOGUEADO : Object.keys(c)[0] ?? "";
        const lotesInicio = c[inicial] ?? [];
        setCampos(c);
        if (inicial) setCliente(inicial);
        if (lotesInicio[0]?.id) setSelected(lotesInicio[0].id);
        setLoading(false);
      })
      .catch((e) => {
        if (alive) console.error("No se pudo cargar Mi Campo:", e);
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [rol]);

  const clientes = Object.keys(campos);
  const [cliente, setCliente] = useState<string>(
    rol === "cliente" ? CLIENTE_LOGUEADO : clientes[0] ?? "",
  );
  const esAdmin = rol !== "cliente";
  const lotesActuales = campos[cliente] ?? [];
  const [selected, setSelected] = useState(lotesActuales[0]?.id ?? "");
  const sel = lotesActuales.find((l) => l.id === selected) ?? lotesActuales[0];
  const totalHa = lotesActuales.reduce((a, l) => a + l.ha, 0);
  const faseActiva = sel?.fase ?? 0;
  const selMeta = sel ? estadoMeta[sel.est] : undefined;

  if (loading) {
    return (
      <DashboardLayout title="Mi Campo" sidebarItems={navItems} breadcrumb="Mapeo SIG y gestión territorial">
        <Card className="p-8 text-center text-ink-soft">Cargando establecimientos…</Card>
      </DashboardLayout>
    );
  }

  if (!sel || !selMeta) {
    return (
      <DashboardLayout title="Mi Campo" sidebarItems={navItems} breadcrumb="Mapeo SIG y gestión territorial">
        <Card className="p-8 text-center text-ink-soft">No hay lotes para el establecimiento seleccionado.</Card>
      </DashboardLayout>
    );
  }

  // Datos para el donut de hectáreas por cultivo (del establecimiento seleccionado)
  const cultivos = ["Trigo", "Maíz", "Soja"];
  const cultivoDist = lotesActuales.reduce((acc, l) => {
    acc[l.cultivo] = (acc[l.cultivo] ?? 0) + l.ha;
    return acc;
  }, {} as Record<string, number>);
  const totalCultivo = Math.max(1, Object.values(cultivoDist).reduce((a, b) => a + b, 0));
  const donutSegments = cultivos
    .filter((c) => cultivoDist[c])
    .map((c) => ({
      label: c,
      value: cultivoDist[c],
      color: c === "Trigo" ? "#c9a227" : c === "Maíz" ? "#c8754f" : "#3a7d44",
    }));

  // KPIs del lote seleccionado (no del establecimiento)
  const kpis = [
    { k: "Superficie", v: String(sel.ha), u: "ha", spark: [40, 40, 40, 40, 40, sel.ha], color: "#2f5233" },
    { k: "Índice NDVI", v: sel.ndvi.toFixed(2), u: "", spark: [0.3, 0.34, 0.33, 0.38, sel.ndvi], color: "#3a7d44" },
    { k: "Humedad suelo", v: String(sel.humedad), u: "%", spark: [54, 56, 53, 55, sel.humedad], color: "#6b8f4e" },
    { k: `Rend. ${sel.cultivo}`, v: `${sel.sentido[sel.sentido.length - 1]}`, u: "q/ha", spark: sel.sentido, color: "#c9a227" },
  ];

  return (
    <DashboardLayout
      title="Mi Campo"
      sidebarItems={navItems}
      breadcrumb="Mapeo SIG y gestión territorial"
    >
      {/* Hero: mapa satelital + KPIs con sparklines */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
            <div className="flex items-center gap-2 text-sm">
              <IconTile tone="green" className="h-8 w-8">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              </IconTile>
              <div>
                <p className="font-medium text-ink">Establecimiento "{cliente}"</p>
                <p className="text-xs text-ink-soft">Imagen satelital · NDVI · {lotesActuales.length} lotes</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {esAdmin ? (
                <div className="flex overflow-hidden rounded-lg bg-base-subtle p-0.5 ring-1 ring-agro-border">
                  {clientes.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCliente(c); const primerId = campos[c]?.[0]?.id; if (primerId) setSelected(primerId); }}
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                        cliente === c ? "bg-agro-green text-white shadow-sm" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : (
                <Badge tone="green">{cliente}</Badge>
              )}
            </div>
          </div>

          {/* Selector de lotes del establecimiento */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-agro-border bg-base-subtle/40 px-5 py-2.5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Lotes</span>
            {lotesActuales.map((l) => {
              const m = estadoMeta[l.est];
              return (
                <button
                  key={l.id}
                  onClick={() => setSelected(l.id)}
                  className={`group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    sel.id === l.id
                      ? "border-agro-green bg-agro-green text-white"
                      : "border-agro-border bg-card text-ink-soft hover:border-agro-green/50 hover:text-ink"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${sel.id === l.id ? "bg-white" : m.dot}`} />
                  {l.name}
                  <span className={`text-[10px] font-medium ${sel.id === l.id ? "text-white/70" : "text-ink-faint"}`}>
                    {l.cultivo} · {l.ha}ha
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative">
            <SatelliteMap className="h-64 w-full" />
            <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg shadow-float ring-1 ring-agro-border">
              <button className="flex h-8 w-8 items-center justify-center bg-card text-ink hover:bg-base-subtle">+</button>
              <button className="flex h-8 w-8 items-center justify-center border-t border-agro-border bg-card text-ink hover:bg-base-subtle">−</button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 text-[11px] text-white/80">
              <span>33° 23' S · 62° 18' O</span>
              <span className="flex items-center gap-2"><span className="inline-block h-0.5 w-10 bg-white/80" /> 500 m</span>
            </div>
          </div>
        </Card>

        {/* KPIs con sparklines */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-1">
          {kpis.map((kpi) => (
            <Card key={kpi.k} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{kpi.k}</p>
                <span className={`h-2 w-2 rounded-full`} style={{ background: kpi.color }} />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
                {kpi.v}
                {kpi.u && <span className="text-sm font-semibold text-ink-faint"> {kpi.u}</span>}
              </p>
              <Sparkline data={kpi.spark} color={kpi.color} className="mt-1 h-9 w-full" />
            </Card>
          ))}
        </div>
      </div>

      {/* Barra climática: previsión + rosa de los vientos */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <SunIcon />
            <div>
              <p className="text-sm font-semibold text-ink">Despejado · 24°C</p>
              <p className="text-xs text-ink-soft">Lluvia prevista tarde del miércoles</p>
            </div>
          </div>
          <div className="text-right text-xs text-ink-soft">
            <p className="font-semibold text-ink">16 km/h</p>
            <p>viento del sud</p>
          </div>
        </Card>
        <Card className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Rosa de los vientos</p>
            <p className="text-xs text-ink-soft">Dirección predominante S · SO</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-base-subtle ring-1 ring-agro-border">
            <WindRose values={{ N: 18, NE: 12, E: 16, SE: 22, S: 42, SO: 38, O: 24, NO: 20 }} size={52} />
          </div>
        </Card>
        <Card className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Riesgo de heladas</p>
            <p className="text-xs text-ink-soft">Próximos 7 días</p>
          </div>
          <Badge tone="wheat">Bajo</Badge>
        </Card>
      </div>

      {/* Fila 2: Stepper de estado del lote + Donut de hectáreas */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-agro-border px-5 py-4">
            <h3 className="font-semibold text-ink">Estado general del {sel.name}</h3>
            <p className="text-sm text-ink-soft">{sel.cultivo} · {sel.ha} ha</p>
          </div>
          <div className="flex items-center justify-between gap-2 px-5 py-6">
            {fases.map((f, i) => {
              const done = i < faseActiva;
              const active = i === faseActiva;
              const IconMap = [SeedIcon, SprayIcon, SproutIcon, HarvesterIcon];
              const Icon = IconMap[i];
              return (
                <div key={f.etapa} className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done ? "bg-agro-green" : "bg-agro-border"}`} />
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ring-2 transition-all ${
                        done
                          ? "bg-agro-green text-white ring-agro-green"
                          : active
                          ? "bg-card text-agro-green ring-agro-green"
                          : "bg-card text-ink-faint ring-agro-border"
                      }`}
                    >
                      <Icon />
                    </div>
                    <div className={`h-0.5 flex-1 ${i === fases.length - 1 ? "opacity-0" : done ? "bg-agro-green" : "bg-agro-border"}`} />
                  </div>
                  <p className={`mt-2 text-xs font-semibold ${done || active ? "text-ink" : "text-ink-faint"}`}>{f.etapa}</p>
                  <p className={`text-[11px] ${done || active ? "text-ink-soft" : "text-ink-faint"}`}>{f.fecha}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Donut de hectáreas por cultivo */}
        <Card className="flex flex-col items-center justify-center p-6">
          <h3 className="mb-4 self-start text-sm font-semibold text-ink">Distribución de hectáreas</h3>
          <Donut
            segments={donutSegments}
            center={
              <div className="text-center">
                <p className="text-2xl font-bold text-ink">{totalCultivo}</p>
                <p className="text-[11px] text-ink-faint">ha sembradas</p>
              </div>
            }
          />
          <ul className="mt-5 w-full space-y-2">
            {donutSegments.map((s) => (
              <li key={s.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-soft">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold text-ink">{s.value} ha · {Math.round((s.value / totalCultivo) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/* Iconos finos de fase */
function SeedIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a8 8 0 0116 0c0 4-2 6-8 6M4 6c0 4 2 6 8 6M20 6v6c0 4-3 6-8 6M12 12v8" />
    </svg>
  );
}
function SprayIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 3.75h12" />
    </svg>
  );
}
function SproutIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15a7 7 0 007 7c4 0 7-3 7-7 0-5-4-9-9-9H5v9zM5 15V5m4 10a6 6 0 016-6" />
    </svg>
  );
}
function HarvesterIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M8.25 3.75h6L13 7.5h-2l1 3.75" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg className="h-9 w-9 text-agro-ochre" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
    </svg>
  );
}