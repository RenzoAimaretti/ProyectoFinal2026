"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card, IconTile, type Tone } from "@/components/ui/primitives";
import { LogoWordmark } from "@/components/ui/logo";
import { TrendChart, type ChartSeries } from "@/components/ui/charts";
import {
  ArrowRightIcon,
  ChartIcon,
  CheckIcon,
  ClipboardIcon,
  CloudOfflineIcon,
  DashboardIcon,
  FieldIcon,
  FinanceIcon,
  InputsIcon,
  LivestockIcon,
  MachineIcon,
  MapZoomIcon,
  PeopleIcon,
  ProductionIcon,
  ShieldIcon,
} from "@/components/ui/icons";

/* ------------------------------------------------------------------ */
/* Static content (Spanish UI copy)                                    */
/* ------------------------------------------------------------------ */

const NAV_ANCHORS = [
  { label: "Producto", href: "#producto" },
  { label: "Módulos", href: "#modulos" },
  { label: "Móvil", href: "#movil" },
  { label: "Cómo funciona", href: "#como-funciona" },
];

const VALUE_PROPS: {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  description: string;
}[] = [
  {
    icon: <ShieldIcon className="h-5 w-5" />,
    tone: "green",
    title: "Varias firmas, una plataforma",
    description:
      "Eliggi, Eliggi Tufoni y Eliggi Néstor operan con sus datos separados bajo el mismo techo.",
  },
  {
    icon: <CloudOfflineIcon className="h-5 w-5" />,
    tone: "wheat",
    title: "Offline-first de verdad",
    description:
      "El operario carga en el lote sin señal y la app sincroniza sola al recuperar cobertura.",
  },
  {
    icon: <FieldIcon className="h-5 w-5" />,
    tone: "green",
    title: "Trazabilidad por lote",
    description:
      "Cada labor, insumo y parte queda atado al campo y al lote que lo generó.",
  },
  {
    icon: <ChartIcon className="h-5 w-5" />,
    tone: "earth",
    title: "Datos para decidir",
    description:
      "Partes, recepciones y estado de insumos en tableros listos para rendir.",
  },
];

const MODULES: {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  description: string;
  soon?: boolean;
}[] = [
  {
    icon: <MapZoomIcon className="h-5 w-5" />,
    tone: "green",
    title: "Mi Campo & Mapeo",
    description: "Lotes y polígonos por estado, con color sobre el visor de la campaña.",
  },
  {
    icon: <ProductionIcon className="h-5 w-5" />,
    tone: "green",
    title: "Producción",
    description: "Tareas del día ordenadas por campo, lote y estado de avance.",
  },
  {
    icon: <ClipboardIcon className="h-5 w-5" />,
    tone: "wheat",
    title: "Partes de trabajo",
    description: "Bandeja de aprobación con la foto del cuaderno cargada desde el móvil.",
  },
  {
    icon: <InputsIcon className="h-5 w-5" />,
    tone: "earth",
    title: "Insumos por cliente",
    description: "Ingresado, consumido y sobrante por cliente, con validación de recepciones.",
  },
  {
    icon: <MachineIcon className="h-5 w-5" />,
    tone: "slate",
    title: "Maquinaria & combustible",
    description: "Equipos y consumo de combustible atados a cada labor.",
  },
  {
    icon: <PeopleIcon className="h-5 w-5" />,
    tone: "green",
    title: "Gestión de personal",
    description: "Cuadrillas, roles y asignaciones por firma y por campo.",
  },
  {
    icon: <LivestockIcon className="h-5 w-5" />,
    tone: "earth",
    title: "Ganadero de precisión",
    description: "Eventos sanitarios, pesajes y movimientos; lectura RFID en camino.",
  },
  {
    icon: <FinanceIcon className="h-5 w-5" />,
    tone: "wheat",
    title: "Finanzas multi-firma",
    description: "Facturas, cheques y rentabilidad por razón social.",
    soon: true,
  },
];

const ROLES: { icon: React.ReactNode; title: string; description: string }[] = [
  {
    icon: <DashboardIcon className="h-5 w-5" />,
    title: "Administrador / dueño",
    description:
      "Visión total de la operación: finanzas, asignación de tareas, aprobaciones y márgenes por firma.",
  },
  {
    icon: <ClipboardIcon className="h-5 w-5" />,
    title: "Operativo administrativo",
    description:
      "Carga rápida de facturas, recibos y remitos, con conciliación de comprobantes y cheques.",
  },
  {
    icon: <MachineIcon className="h-5 w-5" />,
    title: "Operario a campo",
    description:
      "Partes diarios, fotos de respaldo y consumo de combustible desde el móvil.",
  },
  {
    icon: <FieldIcon className="h-5 w-5" />,
    title: "Ingeniero agrónomo",
    description:
      "Recetas fitosanitarias, dosis por hectárea y planificación de rotaciones.",
  },
  {
    icon: <ShieldIcon className="h-5 w-5" />,
    title: "Cliente / productor",
    description:
      "Panel exclusivo de auditoría para seguir labores, insumos y certificaciones sobre sus lotes.",
  },
  {
    icon: <PeopleIcon className="h-5 w-5" />,
    title: "Permisos por rol",
    description:
      "Cada perfil accede solo a los módulos y datos que le corresponden.",
  },
];

const STEPS: {
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
}[] = [
  {
    icon: <MachineIcon className="h-5 w-5" />,
    step: "01",
    title: "Cargar en campo",
    description:
      "El operario registra el parte diario desde el móvil, con la foto del cuaderno, aunque esté sin señal.",
  },
  {
    icon: <ClipboardIcon className="h-5 w-5" />,
    step: "02",
    title: "Aprobar en la oficina",
    description:
      "El administrativo revisa cada parte en la bandeja, valida insumos y aprueba o rechaza con trazabilidad.",
  },
  {
    icon: <ChartIcon className="h-5 w-5" />,
    step: "03",
    title: "Auditar y rendir",
    description:
      "El productor sigue sus lotes y el dueño cierra finanzas y rentabilidad por firma con la información ya cargada.",
  },
];

const FAQ: { question: string; answer: string }[] = [
  {
    question: "¿Cómo conviven varias firmas en la misma plataforma?",
    answer:
      "El sistema es multi-tenant y multi-firma. Cada razón social opera con sus propios datos y usuarios, con aislamiento por tenant, y el dueño puede ver el consolidado según su rol.",
  },
  {
    question: "¿Qué pasa si el operario carga un parte sin señal?",
    answer:
      "La app móvil es offline-first: guarda el parte en el dispositivo, lo marca como pendiente y lo sincroniza automáticamente cuando recupera conexión. La carga en el lote no se pierde por falta de cobertura.",
  },
  {
    question: "¿Quién ve la información de cada cliente?",
    answer:
      "El acceso está segmentado por rol. El productor accede a un panel de auditoría de sus propios lotes, el operario ve solo lo necesario para cargar su trabajo y el administrador gestiona toda la operación.",
  },
  {
    question: "¿Cómo se protege la información de cada productor?",
    answer:
      "El aislamiento por tenant y por firma mantiene los datos separados. Los accesos se resuelven por rol y por cliente, de modo que cada usuario ve únicamente el alcance que le corresponde.",
  },
  {
    question: "¿Qué módulos incluye la plataforma?",
    answer:
      "Mi Campo & Mapeo, Producción, Partes de trabajo, Insumos por cliente, Maquinaria & combustible, Gestión de personal y Ganadero de precisión. Finanzas multi-firma está en camino.",
  },
];

const PREVIEW_ACTIVITY: ChartSeries[] = [
  {
    key: "partes",
    label: "Partes de trabajo",
    color: "var(--color-agro-green)",
    values: [2, 4, 3, 6, 5, 7, 6, 9, 8, 10, 9, 12],
  },
  {
    key: "recepciones",
    label: "Recepciones",
    color: "var(--color-agro-earth)",
    values: [1, 2, 2, 3, 4, 3, 5, 4, 6, 5, 7, 8],
  },
];

const PREVIEW_LABELS = [
  "01/10",
  "03/10",
  "05/10",
  "07/10",
  "09/10",
  "11/10",
  "13/10",
  "15/10",
  "17/10",
  "19/10",
  "21/10",
  "23/10",
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

const PRIMARY_CTA =
  "btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-card transition-all hover:shadow-card-hover active:translate-y-px";

const SECONDARY_CTA =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-agro-border bg-card px-6 text-sm font-semibold text-ink shadow-sm transition-all hover:border-agro-border-strong hover:bg-base-subtle";

function SectionHeading({
  kicker,
  title,
  description,
  inverse = false,
}: {
  kicker: string;
  title: string;
  description?: string;
  inverse?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p
        className={`text-xs font-semibold uppercase tracking-[0.22em] ${
          inverse ? "text-agro-wheat" : "text-agro-green-dark"
        }`}
      >
        {kicker}
      </p>
      <h2
        className={`font-display mt-3 text-display font-semibold ${
          inverse ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mt-3 text-base ${inverse ? "text-white/70" : "text-ink-soft"}`}>
          {description}
        </p>
      )}
    </div>
  );
}

function PhoneField({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="rounded-lg border border-agro-border bg-card px-2.5 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <p className={`text-[12px] font-medium text-ink ${numeric ? "text-numeric" : ""}`}>
        {value}
      </p>
    </div>
  );
}

/** Compact field-map motif built from the design tokens (no raster assets). */
function FieldMapMotif() {
  const parcels: { points: string; fill: string; opacity: number }[] = [
    { points: "20,24 120,16 112,86 24,94", fill: "var(--color-agro-olive)", opacity: 0.55 },
    { points: "134,14 240,22 232,92 126,84", fill: "var(--color-agro-green)", opacity: 0.5 },
    { points: "252,20 305,30 300,96 246,88", fill: "var(--color-agro-wheat)", opacity: 0.5 },
    { points: "18,104 116,96 124,164 26,158", fill: "var(--color-agro-green)", opacity: 0.45 },
    { points: "138,94 240,100 236,162 132,158", fill: "var(--color-agro-earth)", opacity: 0.4 },
    { points: "252,100 306,104 302,160 248,156", fill: "var(--color-agro-olive)", opacity: 0.5 },
  ];
  return (
    <div className="grid-plot relative h-[168px] overflow-hidden rounded-xl border border-agro-border bg-agro-green-soft/50">
      <svg
        viewBox="0 0 320 180"
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        {parcels.map((p, i) => (
          <polygon
            key={i}
            points={p.points}
            fill={p.fill}
            opacity={p.opacity}
            stroke="var(--bg-card)"
            strokeWidth={2}
          />
        ))}
      </svg>
      <span className="absolute right-2 top-2">
        <Badge tone="green">Sembrado</Badge>
      </span>
      <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-3 rounded-lg border border-agro-border bg-card/90 px-2.5 py-1.5 backdrop-blur">
        {[
          { label: "Libre", color: "var(--color-agro-wheat)" },
          { label: "Sembrado", color: "var(--color-agro-green)" },
          { label: "Cosechado", color: "var(--color-agro-earth)" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[10px] font-medium text-ink-soft">
            <span
              className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Browser-frame product preview assembled from the real design system. */
function ProductPreview() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-agro-green/15 via-transparent to-agro-earth/15 blur-2xl"
      />

      <div className="overflow-hidden rounded-card-lg border border-agro-border bg-card shadow-float">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-agro-border bg-base-subtle/70 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-agro-earth/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-agro-wheat/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-agro-green/70" />
          </div>
          <div className="mx-auto hidden items-center gap-2 rounded-md border border-agro-border bg-card px-3 py-1 text-[11px] text-ink-faint sm:flex">
            <ShieldIcon className="h-3 w-3 text-agro-green" />
            agrotrazabilidad.app/dashboard
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-agro-green-dark">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-agro-green" />
            En línea
          </span>
        </div>

        {/* App body */}
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr]">
          {/* Mini rail */}
          <aside className="hidden w-14 flex-col items-center gap-2 border-r border-agro-border bg-agro-sidebar py-4 sm:flex">
            {[MapZoomIcon, ProductionIcon, ClipboardIcon, InputsIcon].map((Icon, i) => (
              <span
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  i === 0
                    ? "bg-agro-green/25 text-agro-olive ring-1 ring-inset ring-agro-green/40"
                    : "text-white/40"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </aside>

          <div className="min-w-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                  Vista general
                </p>
                <p className="font-display text-title font-semibold text-ink">
                  Campaña en curso
                </p>
              </div>
              <Badge tone="slate">Multi-firma</Badge>
            </div>

            {/* Mini KPIs */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Partes por aprobar", value: "7", tone: "text-agro-wheat-dark" },
                { label: "Recepciones", value: "3", tone: "text-agro-earth-dark" },
                { label: "Máquinas activas", value: "12", tone: "text-agro-green-dark" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-agro-border bg-card px-3 py-2.5 shadow-sm"
                >
                  <p className="text-[9px] font-semibold uppercase leading-tight tracking-wider text-ink-faint">
                    {kpi.label}
                  </p>
                  <p className={`text-numeric mt-1 font-display text-lg font-semibold ${kpi.tone}`}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart + map */}
            <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="rounded-xl border border-agro-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-ink">Actividad diaria</p>
                  <span className="text-[10px] text-ink-faint">14 días</span>
                </div>
                <div className="mt-1 h-[150px]">
                  <TrendChart
                    labels={PREVIEW_LABELS}
                    series={PREVIEW_ACTIVITY}
                    height={150}
                    ariaLabel="Vista previa de actividad diaria"
                    emptyMessage="Sin datos para el período."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-agro-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-ink">Estado de lotes</p>
                  <span className="text-[10px] text-ink-faint">La Colorada</span>
                </div>
                <div className="mt-2">
                  <FieldMapMotif />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating sync chip */}
      <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-xl border border-agro-border bg-card px-3 py-2 shadow-pop sm:left-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-agro-wheat/18 text-agro-wheat-dark ring-1 ring-inset ring-agro-wheat/25">
          <CloudOfflineIcon className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-[11px] font-semibold text-ink">Partes sincronizados</p>
          <p className="text-[10px] text-ink-soft">Desde el móvil, al recuperar señal</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-canvas relative min-h-screen overflow-x-hidden">
      {/* Sticky nav */}
      <header className="sticky top-0 z-50 border-b border-agro-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="Agro Trazabilidad, inicio">
            <LogoWordmark size={38} subtitle="Trazabilidad agropecuaria" />
          </Link>

          <nav className="hidden items-center gap-1 rounded-full bg-base-subtle p-1 md:flex">
            {NAV_ANCHORS.map((anchor) => (
              <a
                key={anchor.href}
                href={anchor.href}
                className="rounded-full px-4 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-card hover:text-ink"
              >
                {anchor.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-lg border border-agro-border bg-card px-4 text-sm font-semibold text-ink transition-colors hover:bg-base-subtle"
            >
              Iniciar sesión
            </Link>
            <Link href="/dashboard" className={PRIMARY_CTA + " h-10 px-5"}>
              Explorar el panel
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-agro-border bg-card text-ink-soft transition-colors hover:bg-base-subtle hover:text-ink md:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="animate-fade-in border-t border-agro-border bg-card px-4 pb-4 pt-3 md:hidden">
            <nav className="flex flex-col">
              {NAV_ANCHORS.map((anchor) => (
                <a
                  key={anchor.href}
                  href={anchor.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-base-subtle hover:text-ink"
                >
                  {anchor.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/dashboard" className={PRIMARY_CTA + " w-full"}>
                Explorar el panel
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/login" className={SECONDARY_CTA + " w-full"}>
                Iniciar sesión
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 1. Hero */}
      <section id="producto" className="relative scroll-mt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-[-10%] h-[460px] w-[460px] rounded-full bg-agro-green/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-15%] left-[-8%] h-[380px] w-[380px] rounded-full bg-agro-earth/10 blur-3xl"
        />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-agro-green/30 bg-agro-green/10 px-4 py-1.5 text-xs font-semibold text-agro-green-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-agro-green" />
              SaaS multi-tenant · Multi-firma · Offline-first
            </span>

            <h1 className="font-display mt-6 text-display-xl font-semibold text-ink">
              Toda la operación del campo,{" "}
              <span className="bg-gradient-to-r from-agro-green to-agro-green-deep bg-clip-text text-transparent">
                con trazabilidad de la firma al lote
              </span>
            </h1>

            <p className="mt-6 text-lg text-ink-soft">
              Agro Trazabilidad reúne mapeo, producción, partes de trabajo, insumos,
              maquinaria, personal, ganadería y finanzas en una sola plataforma. Los
              operarios cargan desde el móvil, incluso sin señal, y el productor audita
              todo desde su panel.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className={PRIMARY_CTA}>
                Explorar el panel
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/login" className={SECONDARY_CTA}>
                Iniciar sesión
              </Link>
            </div>

            <ul className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                "Partes aprobados con foto del cuaderno",
                "Stock por cliente: ingresado, consumido y sobrante",
                "Roles separados para oficina, campo y auditoría",
                "Finanzas consolidadas por razón social",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink-soft">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-agro-green" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* 2. Value strip */}
      <section className="border-y border-agro-border bg-base-subtle/50">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-8 gap-y-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {VALUE_PROPS.map((value) => (
            <div key={value.title} className="flex flex-col gap-3">
              <IconTile tone={value.tone}>{value.icon}</IconTile>
              <h3 className="font-display text-title font-semibold text-ink">
                {value.title}
              </h3>
              <p className="text-sm text-ink-soft">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Módulos */}
      <section id="modulos" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Módulos"
            title="Un sistema, todas las labores del agro"
            description="Cada módulo resuelve una parte concreta de la operación y comparte los mismos datos: lo que se carga en el campo llega a la oficina y al productor sin recargar nada."
          />

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((mod) => (
              <Card key={mod.title} className="p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <IconTile tone={mod.tone}>{mod.icon}</IconTile>
                  {mod.soon && <Badge tone="wheat">Próximamente</Badge>}
                </div>
                <h3 className="font-display mt-4 text-title font-semibold text-ink">
                  {mod.title}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{mod.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Para quién es */}
      <section id="roles" className="scroll-mt-24 bg-agro-forest py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Para quién es"
            title="Un rol para cada persona de la cadena"
            description="Desde el dueño que mira el negocio completo hasta el operario que carga el parte a pie de lote. Cada uno entra a lo que necesita."
            inverse
          />

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role) => (
              <div
                key={role.title}
                className="rounded-card-lg border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-agro-wheat ring-1 ring-inset ring-white/15">
                  {role.icon}
                </span>
                <h3 className="font-display mt-4 text-title font-semibold text-white">
                  {role.title}
                </h3>
                <p className="mt-2 text-sm text-white/70">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Móvil offline-first */}
      <section id="movil" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeading
              kicker="App móvil"
              title="El móvil trabaja primero; la señal viene después"
              description="La captura de datos en el lote no depende de la cobertura. La app guarda todo en el dispositivo y lo sincroniza de forma asíncrona cuando vuelve la conexión."
            />

            <ul className="mt-8 space-y-3">
              {[
                {
                  icon: <ClipboardIcon className="h-5 w-5" />,
                  title: "Carga guiada",
                  text: "Cliente, campo, lote y labor en listas desplegables para cargar rápido y sin errores.",
                },
                {
                  icon: <FieldIcon className="h-5 w-5" />,
                  title: "Foto del cuaderno",
                  text: "Cada parte puede adjuntar la foto del respaldo físico como verificación.",
                },
                {
                  icon: <CloudOfflineIcon className="h-5 w-5" />,
                  title: "Estado de sincronización",
                  text: "El operario ve siempre cuántos partes quedan pendientes de subir.",
                },
                {
                  icon: <LivestockIcon className="h-5 w-5" />,
                  title: "RFID a futuro",
                  text: "La lectura de caravanas electrónicas está prevista para el módulo ganadero.",
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <IconTile tone="green">{item.icon}</IconTile>
                  <div>
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[320px]">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-agro-green/10 blur-3xl"
              />
              <div className="relative rounded-[2rem] border border-agro-border bg-agro-sidebar-deep p-2.5 shadow-float">
                <div className="relative overflow-hidden rounded-[1.6rem] bg-base">
                  <div className="absolute left-1/2 top-0 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-agro-sidebar-deep" />

                  <div className="flex items-center justify-between px-5 pb-2 pt-3 text-[10px] font-semibold text-ink-soft">
                    <span className="text-numeric">08:42</span>
                    <span className="flex items-center gap-1 text-agro-wheat-dark">
                      <CloudOfflineIcon className="h-3 w-3" />
                      Sin conexión
                    </span>
                  </div>

                  <div className="px-4 pb-5">
                    <p className="font-display text-base font-semibold text-ink">
                      Parte diario
                    </p>
                    <p className="text-[11px] text-ink-soft">Cargá el trabajo del lote</p>

                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-agro-wheat/30 bg-agro-wheat/10 px-3 py-2 text-[11px] font-medium text-agro-wheat-dark">
                      <CloudOfflineIcon className="h-3.5 w-3.5 shrink-0" />
                      3 partes pendientes de sincronizar
                    </div>

                    <div className="mt-3 space-y-2">
                      <PhoneField label="Cliente" value="Eliggi" />
                      <PhoneField label="Campo" value="La Colorada" />
                      <div className="grid grid-cols-2 gap-2">
                        <PhoneField label="Lote" value="4 · Norte" />
                        <PhoneField label="Labor" value="Pulverización" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <PhoneField label="Hectáreas" value="48,5 ha" numeric />
                        <PhoneField label="Horas" value="6,5 hs" numeric />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-agro-border bg-card px-3 py-2 text-[11px] font-medium text-ink-soft">
                      <ClipboardIcon className="h-4 w-4 shrink-0 text-agro-green" />
                      Adjuntar foto del cuaderno
                    </div>

                    <div className="btn-primary mt-3 flex h-10 items-center justify-center rounded-xl text-[12px] font-semibold text-white">
                      Guardar en el dispositivo
                    </div>

                    <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] text-ink-faint">
                      <CloudOfflineIcon className="h-3 w-3" />
                      Se sincroniza al recuperar señal
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-24 border-y border-agro-border bg-base-subtle/50 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Cómo funciona"
            title="De la tranquera al tablero en tres pasos"
            description="La información recorre el mismo camino que el trabajo real, sin planillas paralelas ni dobles cargas."
          />

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <Card key={step.step} className="relative p-6">
                <div className="flex items-center justify-between">
                  <IconTile tone={index === 1 ? "wheat" : index === 2 ? "earth" : "green"}>
                    {step.icon}
                  </IconTile>
                  <span className="text-numeric font-display text-display font-semibold text-agro-border-strong">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-display mt-5 text-title font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{step.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Preguntas frecuentes"
            title="Lo que conviene saber antes de empezar"
          />

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3">
              {FAQ.slice(0, 3).map((item) => (
                <details
                  key={item.question}
                  className="group card-surface rounded-card-lg border border-agro-border bg-card shadow-card transition-colors open:border-agro-border-strong"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <svg
                      className="h-5 w-5 shrink-0 text-ink-faint transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-ink-soft">{item.answer}</p>
                </details>
              ))}
            </div>
            <div className="space-y-3">
              {FAQ.slice(3).map((item) => (
                <details
                  key={item.question}
                  className="group card-surface rounded-card-lg border border-agro-border bg-card shadow-card transition-colors open:border-agro-border-strong"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <svg
                      className="h-5 w-5 shrink-0 text-ink-faint transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-ink-soft">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA final */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="hero-band px-6 py-10 sm:px-10 sm:py-14">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                  Empezá hoy
                </p>
                <h2 className="font-display mt-3 text-display-lg font-semibold text-white">
                  Ordená la operación desde el primer parte de trabajo
                </h2>
                <p className="mt-3 text-white/80">
                  Explorá el panel con la vista de producto o iniciá sesión para entrar a
                  tu cuenta.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-agro-green-deep shadow-card transition-all hover:bg-white/90 active:translate-y-px"
                >
                  Explorar el panel
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="border-t border-white/10 bg-agro-sidebar-deep">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <LogoWordmark size={40} subtitle="Trazabilidad agropecuaria" tone="inverse" />
            <p className="mt-4 text-sm text-white/60">
              Plataforma SaaS multi-tenant y multi-firma para gestionar campos,
              producción, partes de trabajo e insumos con trazabilidad de punta a punta.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Producto
              </p>
              <ul className="mt-3 space-y-2">
                {NAV_ANCHORS.map((anchor) => (
                  <li key={anchor.href}>
                    <a href={anchor.href} className="text-sm text-white/70 hover:text-white">
                      {anchor.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Acceso
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/dashboard" className="text-sm text-white/70 hover:text-white">
                    Explorar el panel
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-sm text-white/70 hover:text-white">
                    Iniciar sesión
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Plataforma
              </p>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li>Multi-tenant</li>
                <li>Multi-firma</li>
                <li>Offline-first</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-white/50 sm:px-6">
            © 2026 Agro Trazabilidad. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
