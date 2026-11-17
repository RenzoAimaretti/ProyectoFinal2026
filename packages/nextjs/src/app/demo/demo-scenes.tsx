"use client";

// The three views of the public /demo guided journey, rendered in the product's
// own Operate language.
//
// Every view is presentational: it reads the synthetic store in `demo-data.ts`
// and reports decisions upward through callbacks. The demo performs no network
// calls and stores nothing beyond the page-local state owned by `page.tsx`.

import { useState, type ReactNode } from "react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  IconTile,
  KpiCard,
  ProgressBar,
  StatRow,
  StatusBadge,
  type StatusMap,
  type Tone,
} from "@/components/ui/primitives";
import { TrendChart } from "@/components/ui/charts";
import {
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardIcon,
  CloudOfflineIcon,
  FieldIcon,
  InboxIcon,
  InputsIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import {
  DEMO_ADMIN_TREND,
  DEMO_UNITS,
  PARTE_DATA_STATUS,
  certCodeFor,
  fmtDate,
  groupByLote,
  nf,
  parseDecimal,
  type InsumoDraft,
  type Parte,
  type ParteDraft,
  type ParteStatus,
} from "./demo-data";

/* ------------------------------------------------------------------ */
/* Authored icons (the shared set has no brand/utility glyphs)         */
/* ------------------------------------------------------------------ */

/** WhatsApp brand glyph. Filled, brand-shaped — not part of the stroke set. */
export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.42 1.31-1.95 1.36-.53.05-1.02.24-3.44-.72-2.92-1.15-4.76-4.14-4.9-4.33-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.11 1-2.4.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.37-.43.5-.14.14-.28.29-.12.57.16.29.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.61-.14.24.09 1.55.73 1.82.86.27.14.44.21.51.32.07.12.07.68-.17 1.36z" />
    </svg>
  );
}

export function InfoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Status vocabulary                                                   */
/* ------------------------------------------------------------------ */

const PARTE_STATUS_BADGE: StatusMap<ParteStatus> = {
  PENDIENTE: { label: "Pendiente", tone: "wheat", dot: "bg-agro-wheat" },
  APROBADO: { label: "Aprobado", tone: "green", dot: "bg-agro-green" },
  RECHAZADO: { label: "Rechazado", tone: "earth", dot: "bg-agro-earth" },
};

const PLAN_LEGEND: { start: ParteStatus; label: string }[] = [
  { start: "PENDIENTE", label: "Pendiente" },
  { start: "APROBADO", label: "Aprobado" },
  { start: "RECHAZADO", label: "Rechazado" },
];

/* ------------------------------------------------------------------ */
/* Device frames — real shapes from the palette, not a costume         */
/* ------------------------------------------------------------------ */

/** Phone bezel + screen used by the operator view. */
function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[24rem]">
      <div className="relative rounded-[2.4rem] border border-agro-border bg-[var(--op-rail)] p-2.5 shadow-[0_26px_60px_-30px_color-mix(in_srgb,var(--op-ink)_60%,transparent)]">
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-2.5 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/40"
        />
        {/* Fixed device height: the screen scrolls internally like a real phone. */}
        <div className="relative h-[40rem] max-h-[78vh] overflow-y-auto overscroll-contain rounded-[2rem] bg-[var(--op-paper)] pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Browser chrome + screen used by the admin console view. */
function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card-lg border border-agro-border bg-card shadow-[0_26px_60px_-34px_color-mix(in_srgb,var(--op-ink)_55%,transparent)]">
      <div className="flex items-center gap-3 border-b border-agro-border bg-base-subtle px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-agro-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-agro-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-agro-border-strong" />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-agro-border bg-card px-3 py-1">
          <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
          <span className="op-num truncate text-xs text-ink-soft">{url}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vista 1 — Operario                                                  */
/* ------------------------------------------------------------------ */

type OperarioViewProps = {
  draft: ParteDraft;
  onDraftChange: (patch: Partial<ParteDraft>) => void;
  onInsumoChange: (id: string, patch: Partial<InsumoDraft>) => void;
  onAddInsumo: () => void;
  onRemoveInsumo: (id: string) => void;
  onToggleFoto: () => void;
  sendPhase: "idle" | "offline" | "synced";
  onSend: () => void;
  onSync: () => void;
  onReset: () => void;
};

const FIELD_POINTS: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <CloudOfflineIcon className="h-5 w-5" />,
    title: "Sin señal no bloquea",
    text: "El parte se guarda en el dispositivo en el mismo momento en que se carga.",
  },
  {
    icon: <CameraIcon className="h-5 w-5" />,
    title: "Foto del cuaderno",
    text: "La imagen del respaldo físico acompaña al parte como verificación.",
  },
  {
    icon: <CheckIcon className="h-5 w-5" />,
    title: "Sync asincrónico",
    text: "Al recuperar cobertura, la app sube lo pendiente sin intervención.",
  },
];

function PhoneField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="op-label">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function MiniField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="op-caption">{label}</span>
      <span className="mt-0.5 block">{children}</span>
    </label>
  );
}

export function OperarioView({
  draft,
  onDraftChange,
  onInsumoChange,
  onAddInsumo,
  onRemoveInsumo,
  onToggleFoto,
  sendPhase,
  onSend,
  onSync,
  onReset,
}: OperarioViewProps) {
  const captured = sendPhase !== "idle";
  const canSend =
    draft.cliente.trim() !== "" &&
    draft.campo.trim() !== "" &&
    draft.lote.trim() !== "" &&
    draft.labor.trim() !== "" &&
    draft.fecha !== "" &&
    parseDecimal(draft.hectareas) > 0;

  return (
    <section aria-labelledby="demo-operario-title" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <div className="mb-4">
          <h2 id="demo-operario-title" className="text-xl font-semibold tracking-tight text-ink">
            Captura en el campo
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            El operario registra el parte diario desde el lote. La app no depende de la señal.
          </p>
        </div>

        <PhoneFrame>
          <div aria-hidden="true" className="flex items-center justify-between px-5 pb-1 text-xs font-semibold text-ink-faint">
            <span className="op-num">09:41</span>
            <span className="flex items-center gap-1.5">
              <CloudOfflineIcon className="h-3.5 w-3.5" />
              Sin señal
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-agro-border px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">Parte diario</p>
              <p className="truncate text-xs text-ink-soft">{draft.operario}</p>
            </div>
            {captured ? <Badge tone="green">Guardado</Badge> : <Badge tone="wheat">Borrador</Badge>}
          </div>

          <form
            className="px-5 pb-6 pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSend && !captured) onSend();
            }}
          >
            <fieldset disabled={captured} className="space-y-4">
              <legend className="sr-only">Datos del parte diario</legend>

              <PhoneField label="Cliente">
                <input
                  type="text"
                  value={draft.cliente}
                  onChange={(event) => onDraftChange({ cliente: event.target.value })}
                  className="op-input w-full disabled:opacity-70"
                />
              </PhoneField>

              <PhoneField label="Campo">
                <input
                  type="text"
                  value={draft.campo}
                  onChange={(event) => onDraftChange({ campo: event.target.value })}
                  className="op-input w-full disabled:opacity-70"
                />
              </PhoneField>

              <PhoneField label="Lote">
                <input
                  type="text"
                  value={draft.lote}
                  onChange={(event) => onDraftChange({ lote: event.target.value })}
                  className="op-input w-full disabled:opacity-70"
                />
              </PhoneField>

              <PhoneField label="Labor">
                <input
                  type="text"
                  value={draft.labor}
                  onChange={(event) => onDraftChange({ labor: event.target.value })}
                  className="op-input w-full disabled:opacity-70"
                />
              </PhoneField>

              <PhoneField label="Fecha">
                <input
                  type="date"
                  value={draft.fecha}
                  onChange={(event) => onDraftChange({ fecha: event.target.value })}
                  className="op-input w-full disabled:opacity-70"
                />
              </PhoneField>

              <div className="grid grid-cols-2 gap-3">
                <PhoneField label="Hectáreas">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.hectareas}
                    onChange={(event) => onDraftChange({ hectareas: event.target.value })}
                    className="op-input op-num w-full disabled:opacity-70"
                  />
                </PhoneField>
                <PhoneField label="Horas">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.horas}
                    onChange={(event) => onDraftChange({ horas: event.target.value })}
                    className="op-input op-num w-full disabled:opacity-70"
                  />
                </PhoneField>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="op-label">Insumos aplicados</span>
                  <span className="op-caption">{draft.insumos.length}</span>
                </div>
                <ul className="mt-2 space-y-3">
                  {draft.insumos.map((insumo, index) => (
                    <li key={insumo.id} className="border border-agro-border bg-base-subtle/40 p-3">
                      <MiniField label={`Insumo ${index + 1}`}>
                        <input
                          type="text"
                          value={insumo.nombre}
                          onChange={(event) => onInsumoChange(insumo.id, { nombre: event.target.value })}
                          className="op-input w-full disabled:opacity-70"
                        />
                      </MiniField>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <MiniField label="Partida">
                          <input
                            type="text"
                            value={insumo.partida}
                            onChange={(event) => onInsumoChange(insumo.id, { partida: event.target.value })}
                            className="op-input op-num w-full disabled:opacity-70"
                          />
                        </MiniField>
                        <MiniField label="Cantidad">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={insumo.cantidad}
                            onChange={(event) => onInsumoChange(insumo.id, { cantidad: event.target.value })}
                            className="op-input op-num w-full disabled:opacity-70"
                          />
                        </MiniField>
                        <MiniField label="Unidad">
                          <select
                            value={insumo.unidad}
                            onChange={(event) => onInsumoChange(insumo.id, { unidad: event.target.value })}
                            className="op-input w-full disabled:opacity-70"
                          >
                            {DEMO_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </MiniField>
                      </div>
                      {draft.insumos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveInsumo(insumo.id)}
                          className="op-btn op-btn--quiet mt-2"
                        >
                          Quitar insumo
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={onAddInsumo} className="op-btn mt-2 w-full">
                  Agregar insumo
                </button>
              </div>

              <div>
                <span className="op-label">Foto del cuaderno</span>
                {draft.fotoNombre ? (
                  <div className="mt-1 flex items-center gap-3 border border-agro-border bg-card p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-agro-green/10 text-agro-green-dark ring-1 ring-inset ring-agro-green/15">
                      <CameraIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{draft.fotoNombre}</span>
                      <span className="op-caption">Respaldo físico del parte</span>
                    </span>
                    <button type="button" onClick={onToggleFoto} className="op-btn op-btn--quiet">
                      Quitar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onToggleFoto}
                    className="mt-1 flex min-h-[44px] w-full items-center gap-3 border border-dashed border-agro-border bg-base-subtle/40 px-4 py-3 text-left"
                  >
                    <CameraIcon className="h-5 w-5 shrink-0 text-ink-faint" />
                    <span className="text-sm font-medium text-ink">Adjuntar foto</span>
                  </button>
                )}
              </div>
            </fieldset>

            <div className="mt-4 border-t border-agro-border pt-4">
              {sendPhase === "idle" && (
                <>
                  <button type="submit" disabled={!canSend} className="op-btn op-btn--primary w-full">
                    <CloudOfflineIcon className="h-4 w-4" />
                    Enviar parte
                  </button>
                  <p className="op-caption mt-2 text-center">
                    Se guarda en el equipo y se sincroniza al recuperar señal.
                  </p>
                  {!canSend && (
                    <p className="op-caption mt-1 text-center text-agro-wheat-text">
                      Completá cliente, campo, lote, labor, fecha y hectáreas.
                    </p>
                  )}
                </>
              )}

              {sendPhase === "offline" && (
                <div className="border border-agro-wheat/40 bg-agro-wheat/12 p-3">
                  <div className="flex items-start gap-2">
                    <CloudOfflineIcon className="mt-0.5 h-5 w-5 shrink-0 text-agro-wheat-dark" />
                    <div>
                      <p className="text-sm font-semibold text-agro-wheat-dark">Guardado sin señal</p>
                      <p className="op-caption mt-0.5">
                        El parte quedó en el equipo. Se sube al recuperar cobertura.
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={onSync} className="op-btn op-btn--primary mt-3 w-full">
                    Sincronizar ahora
                  </button>
                </div>
              )}

              {sendPhase === "synced" && (
                <div className="border border-agro-green/30 bg-agro-green/10 p-3">
                  <div className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-agro-green-dark" />
                    <div>
                      <p className="text-sm font-semibold text-agro-green-dark">Sincronizado</p>
                      <p className="op-caption mt-0.5">
                        El parte subió y ya está listo para revisar en la oficina.
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={onReset} className="op-btn mt-3 w-full">
                    Cargar otro parte
                  </button>
                </div>
              )}
            </div>
          </form>
        </PhoneFrame>
      </div>

      <aside className="flex flex-col gap-5">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <IconTile tone="wheat">
              <CloudOfflineIcon />
            </IconTile>
            <h3 className="text-lg font-semibold text-ink">El campo carga primero</h3>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            La captura en el lote no depende de la cobertura: el operario registra el trabajo donde
            está y la sincronización ocurre después.
          </p>
          <ul className="mt-4 space-y-3">
            {FIELD_POINTS.map((point) => (
              <li key={point.title} className="flex items-start gap-3">
                <span className="text-agro-green-dark">{point.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-ink">{point.title}</p>
                  <p className="text-xs text-ink-soft">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <p className="op-caption">
          Simulación: el parte es editable y la sincronización es solo visual; no se envía nada.
        </p>
      </aside>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Vista 2 — Admin                                                     */
/* ------------------------------------------------------------------ */

type AdminViewProps = {
  partes: Parte[];
  onDecide: (id: string, status: Extract<ParteStatus, "APROBADO" | "RECHAZADO">) => void;
  onUndo: (id: string) => void;
  /** Id of the part just received, highlighted in the queue. */
  focusId: string | null;
};

export function AdminView({ partes, onDecide, onUndo, focusId }: AdminViewProps) {
  const pending = partes.filter((p) => p.status === "PENDIENTE");
  const decided = partes.filter((p) => p.status !== "PENDIENTE");
  const approved = partes.filter((p) => p.status === "APROBADO");
  const lots = groupByLote(partes);
  const approvedHa = approved.reduce((acc, p) => acc + p.hectareas, 0);
  const approvedPct = partes.length === 0 ? 0 : Math.round((approved.length / partes.length) * 100);

  return (
    <section aria-labelledby="demo-admin-title" className="space-y-5">
      <div>
        <h2 id="demo-admin-title" className="text-xl font-semibold tracking-tight text-ink">
          La oficina recibe el parte
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          El mismo parte que se cargó en el campo llega a la mesa de decisiones. Se aprueba o se
          rechaza con trazabilidad al lote.
        </p>
      </div>

      <BrowserFrame url="app.agrotrazabilidad.com/dashboard">
        <div className="space-y-5 p-4 sm:p-6">
          {/* Mesa de decisiones */}
          <section className="op-plate flex flex-wrap items-end justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="op-label">Mesa de decisiones</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">
                Lo que espera tu decisión
              </h3>
              <p className="mt-1 max-w-xl text-sm text-ink-soft">
                Aprobá los partes que llegan del campo; el plano de lotes se actualiza con cada
                decisión.
              </p>
            </div>
            <div className="text-right">
              <p className="op-num text-3xl font-bold leading-none op-signal-text">
                {pending.length}
              </p>
              <p className="op-label mt-1">Decisiones pendientes</p>
            </div>
          </section>

          {/* KPI row */}
          <section aria-label="Indicadores de la campaña" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard
              label="Partes por aprobar"
              value={String(pending.length)}
              hint={`de ${partes.length} partes`}
              tone="wheat"
              icon={<InboxIcon />}
            />
            <KpiCard
              label="Hectáreas aprobadas"
              value={`${nf.format(approvedHa)} ha`}
              hint="En partes aprobados"
              tone="green"
              icon={<FieldIcon />}
            />
            <KpiCard
              label="Partes aprobados"
              value={String(approved.length)}
              hint="Trazables al lote"
              tone="green"
              icon={<ShieldIcon />}
            />
            <KpiCard
              label="Lotes con partes"
              value={String(lots.length)}
              hint={`${lots.filter((l) => l.approved).length} con certificado`}
              tone="earth"
              icon={<ClipboardIcon />}
            />
          </section>

          {/* Queue + parcel plan */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <Card className="overflow-hidden">
              <CardHeader
                title="Partes por aprobar"
                subtitle={
                  pending.length === 0
                    ? "Nada esperando decisión"
                    : `${pending.length} ${pending.length === 1 ? "parte" : "partes"} esperando decisión`
                }
              />
              {pending.length === 0 ? (
                <EmptyState
                  icon={<InboxIcon />}
                  title="Nada pendiente"
                  subtitle="No hay partes esperando aprobación."
                />
              ) : (
                <ul>
                  {pending.map((parte) => (
                    <li
                      key={parte.id}
                      className={`op-queue-row px-4 py-3 ${parte.id === focusId ? "bg-agro-wheat/10" : ""}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{parte.labor}</p>
                          <p className="truncate text-xs text-ink-soft">{parte.operario}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="op-caption">{fmtDate(parte.fecha)}</span>
                          <button
                            type="button"
                            className="op-btn op-btn--reject"
                            onClick={() => onDecide(parte.id, "RECHAZADO")}
                          >
                            Rechazar
                          </button>
                          <button
                            type="button"
                            className="op-btn op-btn--primary"
                            onClick={() => onDecide(parte.id, "APROBADO")}
                          >
                            Aprobar
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                        <span className="flex items-center gap-1.5">
                          <span className="op-swatch" data-status="pendiente" aria-hidden="true" />
                          <span className="font-medium text-ink">{parte.lote}</span>
                        </span>
                        <span>{parte.campo}</span>
                        <span className="op-num">
                          {nf.format(parte.hectareas)} ha · {nf.format(parte.horas)} hs
                        </span>
                        <span>{parte.cliente}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="overflow-hidden self-start">
              <CardHeader title="Plano de lotes" subtitle="Cada parte se referencia a su lote." />
              <div className="op-plan p-3">
                <ul className="grid grid-cols-2 gap-2">
                  {lots.map((lot) => (
                    <li key={lot.id}>
                      <div className="op-parcel flex w-full flex-col gap-1 px-2.5 py-2">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="op-swatch"
                            data-status={PARTE_DATA_STATUS[lot.status]}
                            aria-hidden="true"
                          />
                          <span className="truncate text-xs font-semibold">{lot.lote}</span>
                        </span>
                        <span className="op-caption truncate">{lot.campo}</span>
                        <span className="op-num text-xs text-ink-soft">
                          {lot.partes.length} {lot.partes.length === 1 ? "parte" : "partes"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-agro-border px-4 py-3">
                <p className="op-label mb-2">Referencias</p>
                <ul className="grid grid-cols-3 gap-x-3 gap-y-2">
                  {PLAN_LEGEND.map((item) => (
                    <li key={item.start} className="flex items-center gap-2 text-xs text-ink-soft">
                      <span
                        className="op-swatch"
                        data-status={PARTE_DATA_STATUS[item.start]}
                        aria-hidden="true"
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </section>

          {/* Trend + resolved */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="overflow-hidden xl:col-span-2">
              <CardHeader
                title="Actividad de la campaña"
                subtitle="Partes de trabajo y recepciones por mes"
                action={<Badge tone="slate">6 meses</Badge>}
              />
              <div className="px-4 pb-4 pt-5">
                <TrendChart
                  labels={DEMO_ADMIN_TREND.labels}
                  series={DEMO_ADMIN_TREND.series}
                  height={240}
                  ariaLabel="Partes de trabajo y recepciones por mes"
                  emptyMessage="Sin datos para el período."
                />
              </div>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader
                title="Resueltos"
                subtitle={`${decided.length} ${decided.length === 1 ? "parte" : "partes"} con decisión`}
              />
              {decided.length === 0 ? (
                <EmptyState
                  icon={<ClipboardIcon />}
                  title="Sin resoluciones"
                  subtitle="Aprobá o rechazá un parte para verlo acá."
                />
              ) : (
                <ul className="divide-y divide-agro-border">
                  {decided.map((parte) => (
                    <li key={parte.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{parte.labor}</p>
                        <p className="truncate text-xs text-ink-faint">{parte.lote}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={parte.status} map={PARTE_STATUS_BADGE} />
                        <button
                          type="button"
                          className="op-btn op-btn--quiet"
                          onClick={() => onUndo(parte.id)}
                        >
                          Deshacer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-4 border-t border-agro-border px-4 py-4">
                <div className="space-y-2.5">
                  <StatRow label="Pendientes" value={String(pending.length)} />
                  <StatRow label="Aprobados" value={String(approved.length)} />
                  <StatRow
                    label="Rechazados"
                    value={String(partes.filter((p) => p.status === "RECHAZADO").length)}
                  />
                </div>
                <div className="border-t border-agro-border pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-ink-soft">Aprobación de partes</span>
                    <span className="op-num text-lg font-semibold text-ink">{approvedPct}%</span>
                  </div>
                  <ProgressBar
                    className="mt-2"
                    value={approvedPct}
                    tone={approvedPct >= 70 ? "green" : approvedPct >= 40 ? "wheat" : "earth"}
                    label="Aprobación de partes"
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">
                    {approved.length} de {partes.length} aprobados
                  </p>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </BrowserFrame>

      <p className="op-caption">
        Simulación: aprobar o rechazar cambia solo el estado visual de esta demostración.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Vista 3 — Cliente (auditoría)                                       */
/* ------------------------------------------------------------------ */

/** Deterministic decorative module grid — reads as a code, is not scannable. */
function CertQr({ className = "" }: { className?: string }) {
  const pattern = [
    "111011101",
    "101010101",
    "111110101",
    "000110010",
    "110101011",
    "001110100",
    "111011101",
    "100010001",
    "111001111",
  ];
  return (
    <svg viewBox="0 0 90 90" className={className} aria-hidden="true">
      {pattern.flatMap((row, y) =>
        row
          .split("")
          .map((cell, x) =>
            cell === "1" ? (
              <rect
                key={`${x}-${y}`}
                x={x * 10}
                y={y * 10}
                width={10}
                height={10}
                rx={1.5}
                fill="currentColor"
              />
            ) : null,
          ),
      )}
    </svg>
  );
}

function ChainNode({
  icon,
  tone,
  stage,
  title,
  children,
}: {
  icon: ReactNode;
  tone: Tone;
  stage: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="h-full p-5">
      <div className="flex items-center gap-3">
        <IconTile tone={tone}>{icon}</IconTile>
        <span className="flex items-center gap-2">
          <p className="op-label">{stage}</p>
          <span className="op-swatch" data-status="aprobado" aria-hidden="true" />
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function ChainArrow() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center px-1 py-1 text-ink-faint lg:py-0">
      <ChevronRightIcon className="h-4 w-4 rotate-90 lg:rotate-0" />
    </div>
  );
}

function DataField({ label, value, numeric = false }: { label: string; value: ReactNode; numeric?: boolean }) {
  return (
    <div>
      <p className="op-label">{label}</p>
      <p className={`mt-0.5 text-sm font-medium text-ink ${numeric ? "op-num" : ""}`}>{value}</p>
    </div>
  );
}

export function ClienteView({ partes }: { partes: Parte[] }) {
  const lots = groupByLote(partes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    lots.find((lot) => lot.id === selectedId) ?? lots.find((lot) => lot.approved) ?? lots[0] ?? null;
  const parte = selected?.approved ?? null;

  // Field-level roll-up derived from the store. Every figure has a source; an
  // empty store resolves to zero instead of inventing a metric.
  const totalHa = partes.reduce((acc, p) => acc + p.hectareas, 0);
  const approved = partes.filter((p) => p.status === "APROBADO");
  const pending = partes.filter((p) => p.status === "PENDIENTE");
  const lotsWithCert = lots.filter((lot) => lot.approved).length;
  const campos = [...new Set(partes.map((p) => p.campo))];
  const heading = campos.length === 1 ? campos[0] : "Mi campo";
  const cliente = partes[0]?.cliente ?? null;

  const header = (
    <div className="op-plate flex flex-wrap items-end justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="op-label">Panel del campo</p>
        <h2 id="demo-cliente-title" className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {heading}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Tu superficie, tus lotes y el respaldo de cada labor aprobada. Un parte aparece en la
          auditoría recién cuando la oficina lo aprueba.
        </p>
      </div>
      {cliente && (
        <div className="text-right">
          <p className="op-label">Productor</p>
          <p className="mt-1 text-sm font-semibold text-ink">{cliente}</p>
        </div>
      )}
    </div>
  );

  if (lots.length === 0) {
    return (
      <section aria-labelledby="demo-cliente-title" className="space-y-5">
        {header}
        <Card className="overflow-hidden">
          <EmptyState
            icon={<InboxIcon />}
            title="Sin partes cargados"
            subtitle="Cuando el campo cargue un parte, el lote aparece en este panel."
          />
        </Card>
        <p className="op-caption">
          Escenario sintético: el código y el certificado son de ejemplo. La auditoría muestra solo
          partes aprobados.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="demo-cliente-title" className="space-y-5">
      {header}

      {/* KPI row — the real roll-up of the producer's field */}
      <section aria-label="Indicadores del campo" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Hectáreas"
          value={`${nf.format(totalHa)} ha`}
          hint={`En ${partes.length} ${partes.length === 1 ? "parte" : "partes"}`}
          tone="earth"
          icon={<FieldIcon />}
        />
        <KpiCard
          label="Lotes"
          value={String(lots.length)}
          hint={`${lotsWithCert} con certificado`}
          tone="slate"
          icon={<ClipboardIcon />}
        />
        <KpiCard
          label="Labores aprobadas"
          value={String(approved.length)}
          hint="Trazables al lote"
          tone="green"
          icon={<ShieldIcon />}
        />
        <KpiCard
          label="Pendientes"
          value={String(pending.length)}
          hint={pending.length === 0 ? "Nada esperando decisión" : "Esperando decisión en la oficina"}
          tone="wheat"
          icon={<InboxIcon />}
        />
      </section>

      {/* Activity panel — labelled synthetic monthly series */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Actividad del campo"
          subtitle="Partes de trabajo y recepciones por mes"
          action={<Badge tone="slate">6 meses</Badge>}
        />
        <div className="px-4 pb-4 pt-5">
          <TrendChart
            labels={DEMO_ADMIN_TREND.labels}
            series={DEMO_ADMIN_TREND.series}
            height={240}
            ariaLabel="Actividad del campo por mes"
            emptyMessage="Sin datos para el período."
          />
        </div>
      </Card>

      {/* Lots master list + traceable chain (behaviour unchanged) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        {/* Master list of lots */}
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b border-agro-border px-5 py-4">
            <h3 className="font-semibold text-ink">Mis lotes</h3>
            <p className="mt-0.5 text-sm text-ink-soft">Elegí un lote para ver su trazabilidad.</p>
          </div>
          <ul className="max-h-[28rem] overflow-y-auto">
            {lots.map((lot) => {
              const isSel = selected?.id === lot.id;
              return (
                <li key={lot.id} className="border-b border-agro-border">
                  <button
                    type="button"
                    onClick={() => setSelectedId(lot.id)}
                    aria-current={isSel ? "true" : undefined}
                    className={`flex min-h-[44px] w-full items-center gap-3 px-5 py-3 text-left transition-colors motion-reduce:transition-none ${
                      isSel ? "bg-base-subtle" : "hover:bg-base-subtle/60"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isSel ? "bg-ink text-card" : "text-ink-faint"
                      }`}
                      aria-hidden="true"
                    >
                      {isSel ? (
                        <CheckIcon className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{lot.lote}</span>
                        {isSel && <span className="op-label shrink-0">Seleccionado</span>}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                        <span className="op-swatch" data-status={PARTE_DATA_STATUS[lot.status]} aria-hidden="true" />
                        <span className="truncate">{lot.campo}</span>
                        <span aria-hidden="true">·</span>
                        <span className="op-num">
                          {lot.partes.length} {lot.partes.length === 1 ? "parte" : "partes"}
                        </span>
                      </span>
                    </span>
                    <Badge tone={lot.approved ? "green" : "wheat"}>
                      {lot.approved ? "Aprobado" : "Pendiente"}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-auto border-t border-agro-border px-5 py-2.5 text-xs text-ink-faint">
            {lots.length} {lots.length === 1 ? "lote" : "lotes"}
          </p>
        </Card>

        {/* Traceable entry */}
        {parte ? (
          <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
            <li className="flex flex-col lg:flex-1 lg:flex-row lg:items-stretch">
              <div className="lg:flex-1">
                <ChainNode icon={<FieldIcon />} tone="green" stage="Lote" title={parte.lote}>
                  <dl className="space-y-1.5">
                    <DataField label="Establecimiento" value={parte.campo} />
                    <DataField label="Superficie" value={`${nf.format(parte.hectareas)} ha`} numeric />
                    <DataField label="Cliente" value={parte.cliente} />
                  </dl>
                </ChainNode>
              </div>
              <ChainArrow />
            </li>

            <li className="flex flex-col lg:flex-1 lg:flex-row lg:items-stretch">
              <div className="lg:flex-1">
                <ChainNode icon={<ClipboardIcon />} tone="slate" stage="Labor" title={parte.labor}>
                  <dl className="space-y-1.5">
                    <DataField label="Fecha" value={fmtDate(parte.fecha)} numeric />
                    <DataField label="Operario" value={parte.operario} />
                    <DataField
                      label="Trabajo"
                      value={`${nf.format(parte.hectareas)} ha · ${nf.format(parte.horas)} hs`}
                      numeric
                    />
                  </dl>
                </ChainNode>
              </div>
              <ChainArrow />
            </li>

            <li className="flex flex-col lg:flex-1 lg:flex-row lg:items-stretch">
              <div className="lg:flex-1">
                <ChainNode icon={<InputsIcon />} tone="earth" stage="Insumos" title="Aplicados">
                  {parte.insumos.length === 0 ? (
                    <p className="op-caption">Sin insumos registrados.</p>
                  ) : (
                    <ul className="space-y-2">
                      {parte.insumos.map((insumo) => (
                        <li key={insumo.id} className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{insumo.nombre}</p>
                            <p className="op-num text-xs text-ink-faint">Partida {insumo.partida}</p>
                          </div>
                          <span className="op-num shrink-0 text-sm font-semibold text-ink">
                            {nf.format(insumo.cantidad)}
                            <span className="ml-1 text-xs font-medium text-ink-faint">{insumo.unidad}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </ChainNode>
              </div>
              <ChainArrow />
            </li>

            <li className="lg:flex-1">
              <ChainNode icon={<ShieldIcon />} tone="green" stage="Certificación" title="Certificado de trazabilidad">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <DataField label="Código" value={certCodeFor(parte.id)} numeric />
                    <DataField label="Alcance" value="Labores e insumos por lote" />
                    <DataField label="Emite" value="Agro Trazabilidad (demo)" />
                    <div className="pt-1">
                      <Badge tone="green">Verificable</Badge>
                    </div>
                  </div>
                  <span className="hidden h-20 w-20 shrink-0 border border-agro-border bg-card p-2 text-ink sm:block">
                    <CertQr className="h-full w-full" />
                  </span>
                </div>
              </ChainNode>
            </li>
          </ol>
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b border-agro-border px-5 py-4">
              <h3 className="font-semibold text-ink">{selected ? selected.lote : "Sin lote"}</h3>
              <p className="mt-0.5 text-sm text-ink-soft">Trazabilidad del lote</p>
            </div>
            <EmptyState
              icon={<ShieldIcon />}
              title="Sin parte aprobado"
              subtitle="Este lote tiene un parte pendiente en la oficina. La auditoría aparece cuando se aprueba."
            />
          </Card>
        )}
      </div>

      <p className="op-caption">
        Escenario sintético: el código y el certificado son de ejemplo. La auditoría muestra solo
        partes aprobados.
      </p>
    </section>
  );
}
