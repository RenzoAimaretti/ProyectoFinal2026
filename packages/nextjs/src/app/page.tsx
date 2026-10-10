"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { WHATSAPP_URL } from "@/lib/contact";
import { LogoMark } from "@/components/ui/logo";
import {
  ArrowRightIcon,
  ClipboardIcon,
  CloudOfflineIcon,
  DashboardIcon,
  FieldIcon,
  LivestockIcon,
  MachineIcon,
  PeopleIcon,
  ShieldIcon,
} from "@/components/ui/icons";

/* ==================================================================== */
/* Content — real product truth, re-expressed in the almanac register.    */
/* No invented customers, metrics or pricing. Firm names are intentionally */
/* omitted (PRODUCT.md leaves that undecided) and the multi-firm capability */
/* is stated as a capability, never as the lead.                          */
/* ==================================================================== */

const NAV_ANCHORS = [
  { label: "Campaña", href: "#campania" },
  { label: "Recorrido", href: "#recorrido" },
  { label: "Módulos", href: "#modulos" },
  { label: "Campo", href: "#movil" },
  { label: "Consultas", href: "#consultas" },
];

type TraceEntry = {
  date: string;
  stage: string;
  title: string;
  detail: string;
  stamp: string;
  tone: "red" | "green";
  note?: string;
};

/** Demonstration ledger: how one work part travels field → office → client.
 *  Values are the synthetic demo scenario, clearly marked as an example. */
const TRACE: TraceEntry[] = [
  {
    date: "06/10",
    stage: "Campo",
    title: "Parte diario PD-0001 — Pulverización",
    detail: "Lote 4 · Norte · 48,5 ha · 6,5 h",
    stamp: "Sin señal",
    tone: "red",
    note: "Anotado en el móvil sin conexión y guardado en el dispositivo.",
  },
  {
    date: "06/10",
    stage: "Oficina",
    title: "Revisión del parte y validación de insumos",
    detail: "Glifosato 66,2 % (L-2291) · Coadyuvante siliconado (L-2310)",
    stamp: "Aprobado",
    tone: "green",
  },
  {
    date: "07/10",
    stage: "Cliente",
    title: "Auditoría del productor sobre el lote",
    detail: "Lote 4 · Norte · Soja",
    stamp: "CERT-2026-0042",
    tone: "green",
    note: "Cadena trazable: firma → campo → lote → insumo.",
  },
];

const TRACE_DATA: { label: string; value: string }[] = [
  { label: "Labor", value: "Pulverización" },
  { label: "Lote", value: "4 · Norte (Soja)" },
  { label: "Superficie", value: "48,5 ha" },
  { label: "Horas", value: "6,5 h" },
  { label: "Insumos", value: "2 · L-2291 · L-2310" },
  { label: "Certificado", value: "CERT-2026-0042" },
];

const VALUE_PROPS: { title: string; text: string }[] = [
  {
    title: "Offline-first de verdad",
    text: "El operario carga en el lote sin señal y la app sincroniza sola al recuperar cobertura.",
  },
  {
    title: "Trazabilidad por lote",
    text: "Cada labor, insumo y parte queda atado al campo y al lote que lo generó.",
  },
  {
    title: "Varias firmas, datos aislados",
    text: "Cada razón social opera con sus datos separados y su propio alcance, sobre la misma plataforma.",
  },
  {
    title: "Datos para decidir y rendir",
    text: "Partes, recepciones y estado de insumos en tableros listos para rendir.",
  },
];

const MODULES: { title: string; text: string }[] = [
  {
    title: "Mi Campo & Mapeo",
    text: "Lotes y polígonos por estado, con color sobre el visor de la campaña.",
  },
  {
    title: "Producción",
    text: "Tareas del día ordenadas por campo, lote y estado de avance.",
  },
  {
    title: "Partes de trabajo",
    text: "Bandeja de aprobación con la foto del cuaderno cargada desde el móvil.",
  },
  {
    title: "Insumos por cliente",
    text: "Ingresado, consumido y sobrante por cliente, con validación de recepciones.",
  },
  {
    title: "Maquinaria & combustible",
    text: "Equipos y consumo de combustible atados a cada labor.",
  },
  {
    title: "Gestión de personal",
    text: "Cuadrillas, roles y asignaciones por firma y por campo.",
  },
  {
    title: "Ganadero de precisión",
    text: "Eventos sanitarios, pesajes y movimientos; lectura RFID en camino.",
  },
];

const SOON = {
  title: "Finanzas multi-firma",
  text: "Facturas, cheques y rentabilidad por razón social.",
};

const ROLES: { icon: ReactNode; title: string; access: string; text: string }[] = [
  {
    icon: <DashboardIcon className="h-4 w-4" />,
    title: "Administrador / dueño",
    access: "Consolidado",
    text: "Visión total de la operación: finanzas, asignación de tareas, aprobaciones y márgenes por firma.",
  },
  {
    icon: <ClipboardIcon className="h-4 w-4" />,
    title: "Operativo administrativo",
    access: "Oficina",
    text: "Carga rápida de facturas, recibos y remitos, con conciliación de comprobantes y cheques.",
  },
  {
    icon: <MachineIcon className="h-4 w-4" />,
    title: "Operario a campo",
    access: "Móvil",
    text: "Partes diarios, fotos de respaldo y consumo de combustible desde el móvil.",
  },
  {
    icon: <FieldIcon className="h-4 w-4" />,
    title: "Ingeniero agrónomo",
    access: "Técnico",
    text: "Recetas fitosanitarias, dosis por hectárea y planificación de rotaciones.",
  },
  {
    icon: <ShieldIcon className="h-4 w-4" />,
    title: "Cliente / productor",
    access: "Auditoría",
    text: "Panel exclusivo de auditoría para seguir labores, insumos y certificaciones sobre sus lotes.",
  },
  {
    icon: <PeopleIcon className="h-4 w-4" />,
    title: "Permisos por rol",
    access: "Acceso",
    text: "Cada perfil accede solo a los módulos y datos que le corresponden.",
  },
];

const STEPS: { stage: string; title: string; text: string }[] = [
  {
    stage: "Campo",
    title: "Cargar en el lote",
    text: "El operario registra el parte diario desde el móvil, con la foto del cuaderno, aunque esté sin señal.",
  },
  {
    stage: "Oficina",
    title: "Aprobar en la oficina",
    text: "El administrativo revisa cada parte en la bandeja, valida insumos y aprueba o rechaza con trazabilidad.",
  },
  {
    stage: "Cliente",
    title: "Auditar y rendir",
    text: "El productor sigue sus lotes y el dueño cierra finanzas y rentabilidad por firma con la información ya cargada.",
  },
];

const MOBILE_POINTS: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <ClipboardIcon className="h-4 w-4" />,
    title: "Carga guiada",
    text: "Cliente, campo, lote y labor en listas desplegables para cargar rápido y sin errores.",
  },
  {
    icon: <FieldIcon className="h-4 w-4" />,
    title: "Foto del cuaderno",
    text: "Cada parte puede adjuntar la foto del respaldo físico como verificación.",
  },
  {
    icon: <CloudOfflineIcon className="h-4 w-4" />,
    title: "Estado de sincronización",
    text: "El operario ve siempre cuántos partes quedan pendientes de subir.",
  },
  {
    icon: <LivestockIcon className="h-4 w-4" />,
    title: "RFID a futuro",
    text: "La lectura de caravanas electrónicas está prevista para el módulo ganadero.",
  },
];

const FIELD_ROWS: { label: string; value: string }[] = [
  { label: "Cliente", value: "Productor Demo" },
  { label: "Campo", value: "La Esperanza" },
  { label: "Lote", value: "4 · Norte" },
  { label: "Labor", value: "Pulverización" },
  { label: "Hectáreas", value: "48,5 ha" },
  { label: "Horas", value: "6,5 h" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "¿Cómo conviven varias firmas en la misma plataforma?",
    a: "El sistema es multi-tenant y multi-firma. Cada razón social opera con sus propios datos y usuarios, con aislamiento por tenant, y el dueño puede ver el consolidado según su rol.",
  },
  {
    q: "¿Qué pasa si el operario carga un parte sin señal?",
    a: "La app móvil es offline-first: guarda el parte en el dispositivo, lo marca como pendiente y lo sincroniza automáticamente cuando recupera conexión. La carga en el lote no se pierde por falta de cobertura.",
  },
  {
    q: "¿Quién ve la información de cada cliente?",
    a: "El acceso está segmentado por rol. El productor accede a un panel de auditoría de sus propios lotes, el operario ve solo lo necesario para cargar su trabajo y el administrador gestiona toda la operación.",
  },
  {
    q: "¿Cómo se protege la información de cada productor?",
    a: "El aislamiento por tenant y por firma mantiene los datos separados. Los accesos se resuelven por rol y por cliente, de modo que cada usuario ve únicamente el alcance que le corresponde.",
  },
  {
    q: "¿Qué módulos incluye la plataforma?",
    a: "Mi Campo & Mapeo, Producción, Partes de trabajo, Insumos por cliente, Maquinaria & combustible, Gestión de personal y Ganadero de precisión. Finanzas multi-firma está en camino.",
  },
];

/* Plates — real field photographs, sourced by the user. Paper-toned
   fallback + ruled caption keep the page intentional before the files
   land in /public/almanac/. */
type PlateSpec = { src: string; alt: string; index: string; caption: string };

const PLATES: Record<"hero" | "recorrido" | "cuaderno" | "cierre", PlateSpec> = {
  hero: {
    src: "/almanac/campania-lote-pulverizacion.jpg",
    alt: "Pulverizadora trabajando un lote de la campaña con las hileras del cultivo visibles.",
    index: "Placa 01",
    caption:
      "Placa 01 · Pulverización en el Lote 4 · Norte. El parte se anota en el lote y viaja al tablero.",
  },
  recorrido: {
    src: "/almanac/labor-siembra.jpg",
    alt: "Tractor con sembradora abriendo surcos en un lote durante la siembra.",
    index: "Placa 02",
    caption:
      "Placa 02 · Labor de siembra. La secuencia de la campaña se registra labor por labor.",
  },
  cuaderno: {
    src: "/almanac/cuaderno-de-campo.jpg",
    alt: "Cuaderno de campo de tapas gastadas, abierto sobre la caja de una camioneta, con anotaciones a mano.",
    index: "Placa 03",
    caption:
      "Placa 03 · El cuaderno de campo. La foto del respaldo físico respalda cada parte digital.",
  },
  cierre: {
    src: "/almanac/tranquera-atardecer.jpg",
    alt: "Tranquera de un establecimiento agropecuario al atardecer, con el campo de fondo.",
    index: "Placa 04",
    caption: "Placa 04 · La tranquera. El cierre de la campaña, con el dato ya cargado.",
  },
};

/* ==================================================================== */
/* Building blocks                                                       */
/* ==================================================================== */

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.42 1.31-1.95 1.36-.53.05-1.02.24-3.44-.72-2.92-1.15-4.76-4.14-4.9-4.33-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.11 1-2.4.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.37-.43.5-.14.14-.28.29-.12.57.16.29.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.61-.14.24.09 1.55.73 1.82.86.27.14.44.21.51.32.07.12.07.68-.17 1.36z" />
    </svg>
  );
}

function Plate({ src, alt, index, caption }: PlateSpec) {
  return (
    <figure className="alm-plate">
      {/* Required raw <img> slot so the user can drop real photographs in. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      <figcaption>
        <span className="alm-plate-idx">{index}</span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

function Query({ q, a }: { q: string; a: string }) {
  return (
    <details className="alm-query">
      <summary>
        <span>{q}</span>
        <span className="alm-qmark" aria-hidden="true">
          +
        </span>
      </summary>
      <p>{a}</p>
    </details>
  );
}

/* ==================================================================== */
/* Page                                                                  */
/* ==================================================================== */

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  // Close the mobile menu with Escape and return focus to its trigger.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="almanac-world overflow-x-hidden">
      <a href="#contenido" className="alm-skip">
        Saltar al contenido
      </a>

      {/* Masthead — a letterhead rule, not a pill nav */}
      <header className="alm-masthead">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="alm-brand" aria-label="Agro Trazabilidad, inicio">
            <LogoMark size={34} />
            <span className="alm-brand-text">
              <span className="alm-brand-name">Agro Trazabilidad</span>
              <span className="alm-brand-reg">Registro agropecuario</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Secciones">
            {NAV_ANCHORS.map((anchor) => (
              <a key={anchor.href} href={anchor.href} className="alm-nav-link">
                {anchor.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center md:flex">
            <Link href="/login" className="alm-link">
              Iniciar sesión
            </Link>
          </div>

          <button
            type="button"
            ref={menuButtonRef}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="alm-hamburger md:hidden"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[color:var(--almanac-rule)] px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col" aria-label="Secciones">
              {NAV_ANCHORS.map((anchor) => (
                <a
                  key={anchor.href}
                  href={anchor.href}
                  onClick={() => setMenuOpen(false)}
                  className="alm-nav-link"
                >
                  {anchor.label}
                </a>
              ))}
            </nav>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="alm-link mt-2"
            >
              Iniciar sesión
            </Link>
          </div>
        )}
      </header>

      <main id="contenido" tabIndex={-1}>
        {/* 1. First viewport — the almanac spread */}
        <section
          id="campania"
          aria-labelledby="t-campania"
          className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14"
        >
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left column — the campaign register */}
            <div className="lg:col-span-6 xl:col-span-7">
              <p className="alm-label alm-num">Campaña 2025/26 · Registro de ejemplo</p>
              <h1 id="t-campania" className="alm-display mt-3 max-w-[19ch]">
                El almanaque de la campaña: cada labor del lote, trazada de la firma al
                cliente.
              </h1>
              <p className="alm-lead mt-5 max-w-[58ch]">
                Agro Trazabilidad reúne mapeo, producción, partes de trabajo, insumos,
                maquinaria, personal, ganadería y finanzas en una sola plataforma. El
                operario anota en el móvil aunque no haya señal, y el dato llega a la
                oficina y al cliente sin volver a tipearlo.
              </p>

              <ol className="alm-ledger alm-draw mt-8">
                {TRACE.map((entry, i) => (
                  <li
                    key={entry.title}
                    className="alm-entry alm-draw-fade"
                    style={{ animationDelay: `${120 + i * 90}ms` }}
                  >
                    <span className="alm-entry-date alm-num">{entry.date}</span>
                    <div>
                      <div className="alm-entry-top">
                        <span className="alm-label">{entry.stage}</span>
                        <span className={`alm-stamp alm-stamp--${entry.tone}`}>
                          {entry.stamp}
                        </span>
                      </div>
                      <p className="alm-entry-title">{entry.title}</p>
                      <p className="alm-entry-detail alm-num">{entry.detail}</p>
                      {entry.note && <p className="alm-note">{entry.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>

              <p className="alm-note mt-4 max-w-[60ch]">
                Registro de ejemplo: muestra cómo viaja un parte del lote al cliente.
              </p>

              {/* Primary action set as a register line — unmistakable */}
              <Link
                href="/demo"
                className="alm-cta alm-draw-fade mt-8"
                style={{ animationDelay: "420ms" }}
              >
                <span className="alm-cta-mark" aria-hidden="true">
                  +
                </span>
                <span className="alm-cta-label">Ver el demo</span>
                <span className="alm-cta-hint">Datos de ejemplo · sin cuenta</span>
                <ArrowRightIcon className="alm-cta-arrow h-5 w-5" />
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="alm-link"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Hablar por WhatsApp
                </a>
                <Link href="/login" className="alm-link">
                  Iniciar sesión
                </Link>
              </div>
            </div>

            {/* Right column — the plate + the tabular trace block */}
            <div className="lg:col-span-6 xl:col-span-5">
              <Plate {...PLATES.hero} />
              <div className="mt-8">
                <p className="alm-label">Trazabilidad de punta a punta</p>
                <dl className="alm-datalist mt-3">
                  {TRACE_DATA.map((row) => (
                    <div className="alm-datarow" key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="alm-faint mt-3 flex items-center gap-2 text-xs">
                  <CloudOfflineIcon className="h-4 w-4" />
                  Capturado en el lote sin conexión y sincronizado al recuperar señal.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Value props — margin annotations */}
        <section
          id="notas"
          aria-labelledby="t-notas"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="alm-section grid gap-4 lg:grid-cols-12 lg:gap-10">
            <h2 id="t-notas" className="alm-h2 lg:col-span-5">
              Lo que distingue a la plataforma
            </h2>
            <p className="alm-lead max-w-[62ch] lg:col-span-6 lg:col-start-7">
              El dato se carga una vez en el campo y llega a la oficina y al cliente sin
              volver a tipearlo.
            </p>
          </div>

          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((value) => (
              <li key={value.title} className="alm-note">
                <h3 className="alm-h3">{value.title}</h3>
                <p className="alm-body mt-2 text-sm">{value.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. The campaign loop — dated register entries */}
        <section
          id="recorrido"
          aria-labelledby="t-recorrido"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="alm-section grid gap-4 lg:grid-cols-12 lg:gap-10">
            <h2 id="t-recorrido" className="alm-h2 lg:col-span-5">
              De la tranquera al tablero en tres pasos
            </h2>
            <p className="alm-lead max-w-[62ch] lg:col-span-6 lg:col-start-7">
              La información recorre el mismo camino que el trabajo real, sin planillas
              paralelas ni dobles cargas.
            </p>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <ol className="alm-ledger lg:col-span-7">
              {STEPS.map((step) => (
                <li key={step.title} className="alm-entry">
                  <span className="alm-label alm-entry-date">{step.stage}</span>
                  <div>
                    <p className="alm-entry-title">{step.title}</p>
                    <p className="alm-entry-detail">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="lg:col-span-5">
              <Plate {...PLATES.recorrido} />
            </div>
          </div>
        </section>

        {/* 4. Modules — the almanac index */}
        <section
          id="modulos"
          aria-labelledby="t-modulos"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="alm-section grid gap-4 lg:grid-cols-12 lg:gap-10">
            <h2 id="t-modulos" className="alm-h2 lg:col-span-5">
              Un sistema, todas las labores del agro
            </h2>
            <p className="alm-lead max-w-[62ch] lg:col-span-6 lg:col-start-7">
              Cada módulo resuelve una parte concreta de la operación y comparte los mismos
              datos: lo que se carga en el campo llega a la oficina y al productor sin
              recargar nada.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="alm-table">
              <caption className="sr-only">Módulos de la plataforma</caption>
              <thead>
                <tr>
                  <th scope="col" className="alm-marker-cell">
                    <span className="sr-only">Marca</span>
                  </th>
                  <th scope="col">Módulo</th>
                  <th scope="col">Qué resuelve</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod.title}>
                    <td className="alm-marker-cell" aria-hidden="true">
                      —
                    </td>
                    <th scope="row">{mod.title}</th>
                    <td>{mod.text}</td>
                  </tr>
                ))}
                <tr className="alm-soon">
                  <td className="alm-marker-cell" aria-hidden="true">
                    ·
                  </td>
                  <th scope="row">
                    {SOON.title}{" "}
                    <span className="alm-stamp alm-stamp--red">En preparación</span>
                  </th>
                  <td>{SOON.text}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Roles — the payroll register */}
        <section
          id="roles"
          aria-labelledby="t-roles"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="alm-section grid gap-4 lg:grid-cols-12 lg:gap-10">
            <h2 id="t-roles" className="alm-h2 lg:col-span-5">
              Un rol para cada persona de la cadena
            </h2>
            <p className="alm-lead max-w-[62ch] lg:col-span-6 lg:col-start-7">
              Desde el dueño que mira el negocio completo hasta el operario que carga el
              parte a pie de lote. Cada uno entra a lo que necesita.
            </p>
          </div>

          <ul className="alm-ledger mt-10 grid lg:grid-cols-2 lg:gap-x-12">
            {ROLES.map((role) => (
              <li key={role.title} className="alm-entry">
                <span className="alm-label alm-entry-date">{role.access}</span>
                <div>
                  <p className="alm-entry-title flex items-center gap-2">
                    <span className="alm-ico">{role.icon}</span>
                    {role.title}
                  </p>
                  <p className="alm-entry-detail">{role.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Offline-first — the field log */}
        <section
          id="movil"
          aria-labelledby="t-movil"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="alm-section grid gap-4 lg:grid-cols-12 lg:gap-10">
            <h2 id="t-movil" className="alm-h2 lg:col-span-5">
              El móvil trabaja primero; la señal viene después
            </h2>
            <p className="alm-lead max-w-[62ch] lg:col-span-6 lg:col-start-7">
              La captura de datos en el lote no depende de la cobertura. La app guarda todo
              en el dispositivo y lo sincroniza de forma asíncrona cuando vuelve la
              conexión.
            </p>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <ul className="space-y-6 lg:col-span-5">
              {MOBILE_POINTS.map((point) => (
                <li key={point.title} className="alm-note">
                  <h3 className="alm-h3 flex items-center gap-2">
                    <span className="alm-ico">{point.icon}</span>
                    {point.title}
                  </h3>
                  <p className="alm-body mt-1 text-sm">{point.text}</p>
                </li>
              ))}
            </ul>

            <div className="lg:col-span-7">
              <div className="alm-sheet p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="alm-label">Bitácora de campo</p>
                    <p className="alm-h3 mt-1">Parte diario</p>
                  </div>
                  <span className="alm-stamp alm-stamp--red">Sin señal</span>
                </div>

                <p className="alm-note mt-4">
                  3 partes pendientes de sincronizar.
                </p>

                <dl className="alm-fieldgrid mt-4">
                  {FIELD_ROWS.map((row) => (
                    <div className="alm-field" key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="alm-save">
                  <span>Guardar en el dispositivo</span>
                  <ClipboardIcon className="h-5 w-5 text-[color:var(--almanac-green)]" />
                </div>
                <p className="alm-faint mt-3 flex items-center gap-2 text-xs">
                  <CloudOfflineIcon className="h-4 w-4" />
                  Se sincroniza al recuperar señal.
                </p>
              </div>

              <div className="mt-6">
                <Plate {...PLATES.cuaderno} />
              </div>
            </div>
          </div>
        </section>

        {/* 7. FAQ — ledger queries */}
        <section
          id="consultas"
          aria-labelledby="t-consultas"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="alm-section grid gap-4 lg:grid-cols-12 lg:gap-10">
            <h2 id="t-consultas" className="alm-h2 lg:col-span-5">
              Lo que conviene saber antes de empezar
            </h2>
          </div>

          <div className="mt-8 grid gap-x-12 lg:grid-cols-2">
            <div>
              {FAQ.slice(0, 3).map((item) => (
                <Query key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
            <div>
              {FAQ.slice(3).map((item) => (
                <Query key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* 8. Closing register */}
        <section
          id="cierre"
          aria-labelledby="t-cierre"
          className="mx-auto w-full max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20"
        >
          <div className="alm-section grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="lg:col-span-7">
              <span className="alm-stamp alm-stamp--red">Campaña 2025/26</span>
              <h2 id="t-cierre" className="alm-h2 mt-3 max-w-[20ch]">
                Cerrá la campaña con el dato ya cargado
              </h2>
              <p className="alm-body mt-3 max-w-[58ch]">
                Recorré el demo con datos de ejemplo, sin crear cuenta, o hablá con nosotros
                para coordinar una demostración.
              </p>

              <Link href="/demo" className="alm-cta mt-7">
                <span className="alm-cta-mark" aria-hidden="true">
                  +
                </span>
                <span className="alm-cta-label">Ver el demo</span>
                <span className="alm-cta-hint">Datos de ejemplo · sin cuenta</span>
                <ArrowRightIcon className="alm-cta-arrow h-5 w-5" />
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="alm-link"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Hablar por WhatsApp
                </a>
                <Link href="/login" className="alm-link">
                  Iniciar sesión
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <Plate {...PLATES.cierre} />
            </div>
          </div>
        </section>
      </main>

      {/* Footer — ledger colophon */}
      <footer className="alm-colophon">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <span className="flex items-center gap-3">
              <LogoMark size={38} />
              <span className="alm-brand-text">
                <span className="alm-brand-name">Agro Trazabilidad</span>
                <span className="alm-brand-reg">Registro agropecuario</span>
              </span>
            </span>
            <p className="alm-body mt-4 text-sm">
              Captura offline-first en el lote y trazabilidad de punta a punta para gestionar
              campos, producción, partes de trabajo e insumos. Varias firmas operan con sus
              datos aislados sobre la misma plataforma.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="alm-label">Producto</p>
              <ul className="mt-4 space-y-1">
                {NAV_ANCHORS.map((anchor) => (
                  <li key={anchor.href}>
                    <a href={anchor.href} className="alm-link">
                      {anchor.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="alm-label">Acceso</p>
              <ul className="mt-4 space-y-1">
                <li>
                  <Link href="/demo" className="alm-link">
                    Ver el demo
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="alm-link">
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="alm-link"
                  >
                    Hablar por WhatsApp
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="alm-label">Módulos</p>
              <ul className="alm-body mt-4 space-y-1 text-sm">
                {MODULES.map((mod) => (
                  <li key={mod.title}>{mod.title}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-[color:var(--almanac-rule)]">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-5 text-xs sm:flex-row sm:items-center sm:px-6">
            <p className="alm-faint">© 2026 Agro Trazabilidad. Todos los derechos reservados.</p>
            <a href="#campania" className="alm-faint inline-flex items-center gap-1.5">
              Volver arriba
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
