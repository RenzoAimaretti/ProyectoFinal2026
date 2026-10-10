"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import {
  DEMO_SEED_PARTES,
  DEMO_VIEWS,
  WHATSAPP_URL,
  makeInitialDraft,
  makeParteId,
  parseDecimal,
  type DemoViewId,
  type InsumoDraft,
  type Parte,
  type ParteDraft,
  type ParteStatus,
} from "./demo-data";
import { AdminView, ClienteView, InfoIcon, OperarioView, WhatsAppIcon } from "./demo-scenes";

/** Builds a store parte from the operator's draft. Visual only — no network. */
function draftToParte(draft: ParteDraft, partes: Parte[]): Parte {
  const id = makeParteId(partes);
  return {
    id,
    cliente: draft.cliente.trim(),
    campo: draft.campo.trim(),
    lote: draft.lote.trim(),
    labor: draft.labor.trim(),
    fecha: draft.fecha,
    hectareas: parseDecimal(draft.hectareas),
    horas: parseDecimal(draft.horas),
    operario: draft.operario,
    insumos: draft.insumos.map((insumo, index) => ({
      id: `${id}-ins-${index + 1}`,
      nombre: insumo.nombre.trim(),
      partida: insumo.partida.trim(),
      cantidad: parseDecimal(insumo.cantidad),
      unidad: insumo.unidad,
    })),
    fotoNombre: draft.fotoNombre,
    status: "PENDIENTE",
  };
}

export default function DemoPage() {
  // One store for the whole journey.
  const [partes, setPartes] = useState<Parte[]>(DEMO_SEED_PARTES);
  // One view state shared by the tabs and the guided control.
  const [view, setView] = useState<DemoViewId>("operario");
  const [guided, setGuided] = useState(true);
  const [completed, setCompleted] = useState<Record<DemoViewId, boolean>>({
    operario: false,
    admin: false,
    cliente: false,
  });
  const [focusId, setFocusId] = useState<string | null>(null);

  // Operator form state, lifted so it survives switching views.
  const [draft, setDraft] = useState<ParteDraft>(makeInitialDraft);
  const [sendPhase, setSendPhase] = useState<"idle" | "offline" | "synced">("idle");

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stepIndex = DEMO_VIEWS.findIndex((v) => v.id === view);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === DEMO_VIEWS.length - 1;

  const focusTab = (index: number) => {
    const count = DEMO_VIEWS.length;
    const next = ((index % count) + count) % count;
    setView(DEMO_VIEWS[next].id);
    tabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(DEMO_VIEWS.length - 1);
    }
  };

  /* ----- Operator form ----- */
  const patchDraft = (patch: Partial<ParteDraft>) => setDraft((prev) => ({ ...prev, ...patch }));
  const patchInsumo = (id: string, patch: Partial<InsumoDraft>) =>
    setDraft((prev) => ({
      ...prev,
      insumos: prev.insumos.map((insumo) => (insumo.id === id ? { ...insumo, ...patch } : insumo)),
    }));
  const addInsumo = () =>
    setDraft((prev) => ({
      ...prev,
      insumos: [
        ...prev.insumos,
        { id: `draft-ins-${Date.now()}`, nombre: "", partida: "", cantidad: "", unidad: "L" },
      ],
    }));
  const removeInsumo = (id: string) =>
    setDraft((prev) => ({ ...prev, insumos: prev.insumos.filter((insumo) => insumo.id !== id) }));
  const toggleFoto = () =>
    setDraft((prev) => ({
      ...prev,
      fotoNombre: prev.fotoNombre ? null : "cuaderno-parte-nuevo.jpg",
    }));

  /* ----- Journey transitions ----- */
  const handleSend = () => {
    const parte = draftToParte(draft, partes);
    setPartes((prev) => [...prev, parte]);
    setFocusId(parte.id);
    setSendPhase("offline");
    setCompleted((prev) => ({ ...prev, operario: true }));
  };

  const handleSync = () => {
    setSendPhase("synced");
    // Guided flow: watch the part arrive on the admin console.
    if (guided) setView("admin");
  };

  const handleReset = () => {
    setDraft(makeInitialDraft());
    setSendPhase("idle");
  };

  const handleDecide = (id: string, status: Extract<ParteStatus, "APROBADO" | "RECHAZADO">) => {
    setPartes((prev) => prev.map((parte) => (parte.id === id ? { ...parte, status } : parte)));
    if (status === "APROBADO") {
      setCompleted((prev) => ({ ...prev, admin: true }));
      setFocusId(null);
      // Guided flow: the approved part now shows in the client audit.
      if (guided) setView("cliente");
    }
  };

  const handleUndo = (id: string) => {
    setPartes((prev) =>
      prev.map((parte) => (parte.id === id ? { ...parte, status: "PENDIENTE" } : parte)),
    );
  };

  return (
    <main className="operate-world op-canvas relative min-h-screen">
      {/* Persistent demo disclosure — always visible while scrolling. */}
      <div className="sticky top-0 z-50 border-b border-agro-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs sm:px-6">
          <span className="inline-flex items-center gap-1.5 font-semibold text-agro-wheat-text">
            <InfoIcon className="h-4 w-4" />
            Demo — datos de ejemplo
          </span>
          <span className="text-ink-soft">
            Datos sintéticos, solo lectura. Ninguna cifra corresponde a una operación real.
          </span>
          <span className="op-label ml-auto hidden md:inline">Solo lectura</span>
        </div>
      </div>

      {/* Operate header — the demo speaks the product's own survey language. */}
      <header className="border-b border-agro-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Agro Trazabilidad, inicio" className="flex items-center gap-3">
            <LogoMark size={34} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight text-ink">
                Agro Trazabilidad
              </span>
              <span className="op-label">Carta de suelos</span>
            </span>
          </Link>
          <Link href="/" className="op-btn op-btn--quiet">
            Volver al sitio
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-5 sm:px-6">
        {/* Compact intro + primary contact action. */}
        <section className="op-plate mb-4 flex flex-wrap items-end justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              Un parte de trabajo, de punta a punta
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Viví el ciclo real: captura offline en el campo, decisión en la oficina y auditoría del
              productor. Seguí el recorrido guiado o saltá entre las vistas.
            </p>
          </div>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="op-btn op-btn--primary"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Hablar por WhatsApp
          </a>
        </section>

        {/* View switcher + guided control, sharing one state. */}
        <div className="op-plate mb-5 p-1.5">
          <div
            role="tablist"
            aria-label="Vistas del recorrido"
            className="grid grid-cols-3 gap-1.5"
          >
            {DEMO_VIEWS.map((item, index) => {
              const selected = view === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`demo-tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls="demo-view-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setView(item.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  className={`px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "bg-agro-wheat/10 ring-1 ring-inset ring-agro-wheat/30"
                      : "hover:bg-base-subtle"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`op-num text-sm font-semibold ${
                        selected ? "text-agro-wheat-text" : "text-ink-faint"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className={`text-sm font-semibold ${selected ? "text-ink" : "text-ink-soft"}`}>
                      {item.label}
                    </span>
                    {completed[item.id] && (
                      <CheckIcon className="h-3.5 w-3.5 text-agro-green-dark" />
                    )}
                    {completed[item.id] && <span className="sr-only"> (paso completado)</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-agro-border px-3 py-2.5">
            <button
              type="button"
              aria-pressed={guided}
              onClick={() => setGuided((value) => !value)}
              className={`op-btn ${guided ? "op-btn--primary" : ""}`}
            >
              {guided ? "Recorrido guiado: activado" : "Recorrido guiado"}
            </button>

            {guided ? (
              <>
                <p className="min-w-0 flex-1 text-sm text-ink-soft">
                  <span className="op-num font-semibold text-ink">
                    Paso {stepIndex + 1} de {DEMO_VIEWS.length}
                  </span>
                  <span className="mx-2 text-ink-faint" aria-hidden="true">
                    ·
                  </span>
                  {DEMO_VIEWS[stepIndex].hint}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="op-btn"
                    onClick={() => focusTab(stepIndex - 1)}
                    disabled={isFirst}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="op-btn op-btn--primary"
                    onClick={() => focusTab(stepIndex + 1)}
                    disabled={isLast}
                  >
                    Siguiente
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <p className="min-w-0 flex-1 text-sm text-ink-soft">
                Navegación libre: elegí cualquier vista y probá los estados.
              </p>
            )}
          </div>
        </div>

        {/* Active view. Keyed so the entrance replays on every switch. */}
        <div
          key={view}
          id="demo-view-panel"
          role="tabpanel"
          aria-labelledby={`demo-tab-${view}`}
          tabIndex={0}
          className="animate-fade-in-up"
        >
          {view === "operario" && (
            <OperarioView
              draft={draft}
              onDraftChange={patchDraft}
              onInsumoChange={patchInsumo}
              onAddInsumo={addInsumo}
              onRemoveInsumo={removeInsumo}
              onToggleFoto={toggleFoto}
              sendPhase={sendPhase}
              onSend={handleSend}
              onSync={handleSync}
              onReset={handleReset}
            />
          )}
          {view === "admin" && (
            <AdminView
              partes={partes}
              onDecide={handleDecide}
              onUndo={handleUndo}
              focusId={focusId}
            />
          )}
          {view === "cliente" && <ClienteView partes={partes} />}
        </div>

        {/* Closing contact action. */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-agro-border pt-5">
          <p className="op-caption max-w-xl">
            Demo interactiva y solo lectura: ninguna acción envía datos a un servidor. Todo el
            escenario, los nombres y las cifras son sintéticos.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="op-btn op-btn--primary"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
