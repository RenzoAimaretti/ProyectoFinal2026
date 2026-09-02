"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import { Card, Badge, IconTile, Button, ProgressBar, HeroBand, type Tone } from "@/components/ui/primitives";
import { navItems } from "@/components/ui/nav";
import { useRol } from "@/components/ui/rol";

const stock = [
  { cliente: "Agro-Sur", producto: "Glifosato", u: "L", disponible: 3800, ingreso: 4200, sobrante: "corto" },
  { cliente: "Campo Verde", producto: "27-0-0", u: "kg", disponible: 2850, ingreso: 2900, sobrante: "ok" },
  { cliente: "Estancia Los Pinos", producto: "Triazol", u: "L", disponible: 1540, ingreso: 1420, sobrante: "sobra" },
  { cliente: "Agro-Sur", producto: "Urea", u: "kg", disponible: 7000, ingreso: 8600, sobrante: "sobra" },
] as const;

const sobranteMeta: Record<string, { label: string; tone: Tone }> = {
  corto: { label: "Faltante", tone: "earth" },
  ok: { label: "OK", tone: "green" },
  sobra: { label: "Sobrante", tone: "wheat" },
};

/* Ilustración del tipo de insumo: saco (granular) o tambor (líquido) */
function InsumoIcon({ liquido }: { liquido: boolean }) {
  return liquido ? (
    <svg viewBox="0 0 36 36" className="h-9 w-9" fill="none" aria-hidden>
      <ellipse cx="18" cy="10" rx="9" ry="4" stroke="#5b6472" strokeWidth="1.4" />
      <path d="M9 10v16c0 2.2 4 4 9 4s9-1.8 9-4V10" stroke="#5b6472" strokeWidth="1.4" />
      <path d="M9 14c0 2.2 4 4 9 4s9-1.8 9-4M9 18c0 2.2 4 4 9 4s9-1.8 9-4" stroke="#5b6472" strokeWidth="1.2" />
      <path d="M13 24h10" stroke="#3a7d44" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 36 36" className="h-9 w-9" fill="none" aria-hidden>
      <path d="M11 8h14l2.5 6v14H8.5V14L11 8z" stroke="#5b6472" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.5 14h19" stroke="#5b6472" strokeWidth="1.4" />
      <path d="M13 8V4h10v4" stroke="#5b6472" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M15 24h6" stroke="#c8754f" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const catalog = ["Glifosato", "27-0-0", "Triazol", "Urea", "2,4-D", "Lambdacialotrina"];
const CLIENTE_LOGUEADO = "Agro-Sur";

type Ingreso = { id: number; insumo: string; cantidad: number; u: string; estado: "pendiente" | "validada" | "rechazada" };

const semillaPendientes: { cliente: string; insumo: string; cantidad: number; u: string }[] = [
  { cliente: "Agro-Sur", insumo: "Glifosato", cantidad: 800, u: "L" },
  { cliente: "Campo Verde", insumo: "Urea", cantidad: 3000, u: "kg" },
];

function pct(disp: number, ing: number) {
  return Math.round((disp / ing) * 100);
}

const ingMeta: Record<string, { label: string; tone: Tone }> = {
  pendiente: { label: "Pendiente de validación", tone: "wheat" },
  validada: { label: "Validada", tone: "green" },
  rechazada: { label: "Rechazada", tone: "earth" },
};

export default function InsumosPage() {
  const { rol } = useRol();
  const esAdmin = rol !== "cliente";

  // Bandeja de ingresos (admin valida; cliente ve los suyos)
  const [ingresos, setIngresos] = useState<Ingreso[]>(() =>
    semillaPendientes.map((s, i) => ({ id: i, ...s, estado: "pendiente" as const })),
  );
  const [motivo, setMotivo] = useState<Record<number, string>>({});

  // Estado del formulario de ingreso del cliente
  const [showForm, setShowForm] = useState(false);
  const [fInsumo, setFInsumo] = useState(catalog[0]);
  const [fCant, setFCant] = useState("");
  const [ucc, setUcc] = useState(0); // contador para ids

  function setEstado(id: number, estado: Ingreso["estado"]) {
    setIngresos((prev) => prev.map((i) => (i.id === id ? { ...i, estado } : i)));
  }

  const visiblesPendientes = esAdmin
    ? ingresos.filter((i) => i.estado === "pendiente")
    : ingresos.filter((i) => i.cliente === CLIENTE_LOGUEADO);

  const stockCliente = esAdmin ? stock : stock.filter((s) => s.cliente === CLIENTE_LOGUEADO);

  return (
    <DashboardLayout
      title="Insumos"
      sidebarItems={navItems}
      breadcrumb="Recepción de stock y control de partes"
    >
      <HeroBand
        kicker={esAdmin ? "Recepción y control de stock" : "Trazabilidad de tus insumos"}
        title="Insumos"
        description={
          esAdmin
            ? "Stock por cliente, bandeja de ingresos por validar y control de sobrantes y faltantes de campaña."
            : "Ingresá los insumos que dejás en el campo para que el administrador los valide, y seguí su estado de stock."
        }
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M8.25 3.75h7.5l1.5 3.75h-10.5l1.5-3.75z" />
          </svg>
        }
        actions={
          esAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">
                {ingresos.filter((i) => i.estado === "pendiente").length} por validar
              </span>
              <Button className="!bg-white/95 !text-agro-green-deep !hover:bg-white">+ Registrar ingreso</Button>
            </div>
          ) : (
            <Button className="!bg-white/95 !text-agro-green-deep !hover:bg-white" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cerrar" : "+ Notificar ingreso"}
            </Button>
          )
        }
      />

      {/* Cliente: formulario de notificación de ingreso */}
      {!esAdmin && showForm && (
        <Card className="mb-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-agro-border px-5 py-4">
            <div>
              <h3 className="font-semibold text-ink">Notificar ingreso de insumos</h3>
              <p className="text-sm text-ink-soft">
                Indicá lo que dejaste en el campo; el administrador lo validará e ingresará tu stock.
              </p>
            </div>
            <Badge tone="wheat">Pendiente de validación</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-faint">Insumo</label>
              <select
                value={fInsumo}
                onChange={(e) => setFInsumo(e.target.value)}
                className="w-full rounded-lg border border-agro-border bg-card px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-agro-green/40"
              >
                {catalog.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-faint">Cantidad</label>
              <input
                value={fCant}
                onChange={(e) => setFCant(e.target.value)}
                placeholder="Ej: 800"
                type="number"
                className="w-full rounded-lg border border-agro-border bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-agro-green/40"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  const q = Number(fCant);
                  if (!q || q <= 0) return;
                  setIngresos((p) => [
                    ...p,
                    { id: p.length + ucc + 100, insumo: fInsumo, cantidad: q, u: "u", estado: "pendiente" },
                  ]);
                  setUcc((v) => v + 1);
                  setFCant("");
                }}
                className="w-full rounded-lg bg-agro-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-agro-green-dark"
              >
                Enviar para validación
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Bandeja de validación (admin) / mis ingresos (cliente) */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-agro-border px-5 py-4">
          <div>
            <h3 className="font-semibold text-ink">
              {esAdmin ? "Ingresos por validar" : "Mis ingresos de insumos"}
            </h3>
            <p className="text-sm text-ink-soft">
              {esAdmin
                ? "Validá por mutuo acuerdo la cantidad indicada por cada cliente."
                : "Estado de cada recepción: pendiente, validada o rechazada."}
            </p>
          </div>
          <Badge tone={ingresos.some((i) => i.estado === "pendiente") ? "wheat" : "green"}>
            {esAdmin ? `${visiblesPendientes.length} pendientes` : `${visiblesPendientes.length} en tu cuenta`}
          </Badge>
        </div>
        {visiblesPendientes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">
            No hay ingresos {esAdmin ? "pendientes de validación" : "asociados a tu cuenta"}.
          </p>
        ) : (
          <ul className="divide-y divide-agro-border">
            {visiblesPendientes.map((i) => {
              const m = ingMeta[i.estado];
              return (
                <li key={i.id} className="stagger-item flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile tone={i.estado === "pendiente" ? "wheat" : i.estado === "validada" ? "green" : "earth"} className="h-9 w-9">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M8.25 3.75h7.5l1.5 3.75h-10.5l1.5-3.75z" /></svg>
                    </IconTile>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {i.cantidad.toLocaleString("es-AR")} {i.u} · {i.insumo}
                        {esAdmin && <span className="ml-2 text-xs font-normal text-ink-faint">{i.cliente}</span>}
                      </p>
                      <Badge tone={m.tone}>{m.label}</Badge>
                    </div>
                  </div>

                  {esAdmin && i.estado === "pendiente" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={motivo[i.id] ?? ""}
                        onChange={(e) => setMotivo((p) => ({ ...p, [i.id]: e.target.value }))}
                        placeholder="Motivo de rechazo"
                        className="rounded-lg border border-agro-border bg-card px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:outline-none"
                      />
                      <Button
                        className="!px-3 !py-2"
                        onClick={() => setEstado(i.id, "validada")}
                      >
                        Validar
                      </Button>
                      <button
                        onClick={() => setEstado(i.id, "rechazada")}
                        className="rounded-lg border border-agro-border px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-base-subtle"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {esAdmin ? (
        /* Admin: stock por cliente con filtro */
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="overflow-hidden lg:col-span-3">
            <div className="flex items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
              <h3 className="font-semibold text-ink">Stock por cliente</h3>
            </div>
            <div className="hidden grid-cols-12 gap-3 border-b border-agro-border px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint md:grid">
              <span className="col-span-4">Cliente</span>
              <span className="col-span-5">Disponible</span>
              <span className="col-span-3 text-right">Estado</span>
            </div>
            <ul className="divide-y divide-agro-border">
              {stockCliente.map((s) => {
                const m = sobranteMeta[s.sobrante];
                return (
                  <li key={s.cliente + s.producto} className="grid grid-cols-12 items-center gap-3 px-5 py-3">
                    <div className="col-span-12 flex items-center gap-3 md:col-span-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-base-subtle ring-1 ring-agro-border">
                        <InsumoIcon liquido={s.u === "L"} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{s.producto}</p>
                        <p className="text-xs text-ink-faint">{s.cliente}</p>
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-5">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-ink-soft">{s.disponible.toLocaleString("es-AR")} {s.u} disponible</span>
                        <span className="text-ink-faint">de {s.ingreso.toLocaleString("es-AR")} {s.u}</span>
                      </div>
                      <ProgressBar value={pct(s.disponible, s.ingreso)} tone={m.tone} />
                    </div>
                    <div className="col-span-12 flex justify-start md:col-span-3 md:justify-end">
                      <Badge tone={m.tone}>{m.label}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      ) : (
        /* Cliente: su stock + descuento por partes */
        <Card className="overflow-hidden">
          <div className="border-b border-agro-border px-5 py-4">
            <h3 className="font-semibold text-ink">Tu stock disponible</h3>
            <p className="text-sm text-ink-soft">Se descuenta automáticamente al aprobarse los partes de labor.</p>
          </div>
          <div className="hidden grid-cols-12 gap-3 border-b border-agro-border px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint md:grid">
            <span className="col-span-5">Insumo</span>
            <span className="col-span-4">Disponible</span>
            <span className="col-span-3 text-right">Estado</span>
          </div>
          <ul className="divide-y divide-agro-border">
            {stockCliente.map((s) => {
              const m = sobranteMeta[s.sobrante];
              return (
                <li key={s.producto} className="grid grid-cols-12 items-center gap-3 px-5 py-3">
                  <div className="col-span-12 flex items-center gap-3 md:col-span-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-base-subtle ring-1 ring-agro-border">
                      <InsumoIcon liquido={s.u === "L"} />
                    </div>
                    <p className="truncate text-sm font-semibold text-ink">{s.producto}</p>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <p className="text-sm text-ink-soft">{s.disponible.toLocaleString("es-AR")} {s.u}</p>
                  </div>
                  <div className="col-span-12 flex justify-start md:col-span-3 md:justify-end">
                    <Badge tone={m.tone}>{m.label}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </DashboardLayout>
  );
}