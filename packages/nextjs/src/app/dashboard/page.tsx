import Link from "next/link";
import { DashboardLayout } from "@/components/ui/layout";
import { Badge, Card, IconTile, StatRow, ProgressBar, EmptyState, type Tone } from "@/components/ui/primitives";

const navItems = [
  { label: "Mi Campo", href: "/dashboard/mi-campo" },
  { label: "Producción", href: "/dashboard/produccion" },
  { label: "Insumos", href: "/dashboard/insumos" },
  { label: "Finanzas", href: "/dashboard/finanzas" },
  { label: "Ganadería", href: "/dashboard/ganadero" },
];

const hoy = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

const notif = [
  { tone: "wheat" as Tone, titulo: "Ingreso por validar", detalle: "Agro-Sur · Glifosato 800 L", href: "/dashboard/insumos" },
  { tone: "green" as Tone, titulo: "Parte aprobado", detalle: "Pulverización · Lote N°2", href: "/dashboard/produccion" },
  { tone: "earth" as Tone, titulo: "Alerta de stock", detalle: "Triazol casi agotado", href: "/dashboard/insumos" },
];

const labor = [
  { hora: "08:30", desc: "Fertilización 27-0-0", lote: "Lote N°1 · 96 ha" },
  { hora: "10:15", desc: "Siembra cabeceras", lote: "Campo Verde N°1" },
  { hora: "13:00", desc: "Pulverización 2do golpe", lote: "Estancia Los Pinos" },
];

function ModuleCard({
  icon,
  tone,
  title,
  desc,
  href,
  chips,
}: {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  desc: string;
  href: string;
  chips: string[];
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card-lg border border-agro-border bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-agro-border-strong hover:shadow-card-hover"
    >
      <div className="flex items-start gap-4">
        <IconTile tone={tone} className="h-11 w-11">
          {icon}
        </IconTile>
        <div className="flex-1">
          <h3 className="font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{desc}</p>
        </div>
        <svg className="h-5 w-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c} className="rounded-md bg-base-subtle px-2 py-1 text-xs font-medium text-ink-soft ring-1 ring-inset ring-agro-border">
            {c}
          </span>
        ))}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <DashboardLayout
      title="Vista general"
      sidebarItems={navItems}
      breadcrumb="Panel principal"
    >
      {/* Hero: bienvenida con fecha + notificaciones destacadas */}
      <Card className="overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-agro-green-deep via-agro-green to-agro-green-dark p-7 text-white lg:p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 right-32 h-40 w-40 rounded-full bg-white/5 blur-xl" />
          <div className="relative">
            <p className="text-sm font-medium capitalize text-white/75">{hoy}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
              Buenas. Acá está tu panorama de operaciones.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
              Estado de labores, insumos por validar y las alertas que necesitás
              atender hoy para que la campaña siga en tiempo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-agro-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {notif.map((n) => (
            <Link
              key={n.titulo}
              href={n.href}
              className="flex items-start gap-3 p-4 transition-colors hover:bg-base-subtle"
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                n.tone === "wheat" ? "bg-agro-wheat" : n.tone === "green" ? "bg-agro-green" : "bg-agro-earth"
              }`} />
              <div>
                <p className="text-sm font-semibold text-ink">{n.titulo}</p>
                <p className="text-sm text-ink-soft">{n.detalle}</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* KPIs con depth */}
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card-lg border border-agro-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Clima local</p>
          <p className="mt-2 text-2xl font-bold text-ink">24° C</p>
          <p className="mt-1 text-xs text-ink-soft">Despejado · viento 9 N</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-subtle">
            <div className="h-full w-2/3 rounded-full bg-agro-wheat" />
          </div>
        </div>

        <div className="rounded-card-lg border border-agro-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Hectáreas esta semana</p>
          <p className="mt-2 text-2xl font-bold text-ink">420 ha</p>
          <p className="mt-1 text-xs font-medium text-agro-green-dark">+25% vs semana pasada</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-subtle">
            <div className="h-full w-3/4 rounded-full bg-agro-green" />
          </div>
        </div>

        <div className="rounded-card-lg border border-agro-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Insumos por validar</p>
          <p className="mt-2 text-2xl font-bold text-ink">3</p>
          <p className="mt-1 text-xs text-ink-soft">2 requieren revisión</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-subtle">
            <div className="h-full w-1/3 rounded-full bg-agro-earth" />
          </div>
        </div>

        <div className="rounded-card-lg border border-agro-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Combustible</p>
          <p className="mt-2 text-2xl font-bold text-ink">1,240 L</p>
          <p className="mt-1 text-xs text-ink-soft">87% del tanque</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-subtle">
            <div className="h-full w-[87%] rounded-full bg-agro-charcoal" />
          </div>
        </div>
      </section>

      {/* Bento: módulos + actividad reciente */}
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-2">
          <ModuleCard
            tone="green"
            title="Mi Campo"
            desc="Mapeo SIG por lote, rotaciones y planificación territorial de la campaña."
            href="/dashboard/mi-campo"
            icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>}
            chips={["SIG", "Lotes", "Rotaciones"]}
          />
          <ModuleCard
            tone="earth"
            title="Producción"
            desc="Partes diarios de labores, recetas de aplicación y condiciones en campo."
            href="/dashboard/produccion"
            icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75z" /></svg>}
            chips={["Partes", "Recetas", "Clima"]}
          />
          <ModuleCard
            tone="wheat"
            title="Insumos"
            desc="Stock por cliente, recepción y validación de ingresos por campaña."
            href="/dashboard/insumos"
            icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M8.25 3.75h7.5l1.5 3.75h-10.5l1.5-3.75z" /></svg>}
            chips={["Stock", "Recepción", "Validación"]}
          />
          <ModuleCard
            tone="slate"
            title="Finanzas"
            desc="Facturación, remitos, cheques y conciliación por establecimiento."
            href="/dashboard/finanzas"
            icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>}
            chips={["CFDI", "Cheques", "Conciliación"]}
          />
        </div>

        {/* Actividad reciente */}
        <Card className="overflow-hidden">
          <div className="border-b border-agro-border px-5 py-4">
            <h3 className="font-semibold text-ink">Labores en curso</h3>
            <p className="text-sm text-ink-soft">Hoy · jornada en campo</p>
          </div>
          <ol className="divide-y divide-agro-border">
            {labor.map((l) => (
              <li key={l.hora + l.desc} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-base-subtle">
                <span className="w-11 shrink-0 rounded-md bg-base-subtle px-2 py-1 text-center text-xs font-semibold text-ink-soft ring-1 ring-inset ring-agro-border">
                  {l.hora}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{l.desc}</p>
                  <p className="truncate text-xs text-ink-faint">{l.lote}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="border-t border-agro-border p-3">
            <Link
              href="/dashboard/produccion"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-agro-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-base-subtle"
            >
              Ver jornada completa
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            </Link>
          </div>
        </Card>
      </section>

      {/* Estado general de insumos */}
      <section className="mt-6">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
            <div>
              <h3 className="font-semibold text-ink">Estado de insumos por cliente</h3>
              <p className="text-sm text-ink-soft">Disponible contra ingreso de la campaña</p>
            </div>
            <Badge tone="green">82% en orden</Badge>
          </div>
          <div className="grid grid-cols-1 divide-y divide-agro-border md:grid-cols-3 md:divide-x">
            {[
              { c: "Agro-Sur", p: "Trigo · Glifosato", v: 88, label: "5,200 L disp" },
              { c: "Campo Verde", p: "Soja · 27-0-0", v: 62, label: "8,800 kg disp" },
              { c: "Est. Los Pinos", p: "Maíz · Triazol", v: 41, label: "1,540 L disp" },
            ].map((s) => (
              <div key={s.c} className="p-5">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{s.c}</span>
                  <span className="text-xs text-ink-faint">{s.label}</span>
                </div>
                <p className="text-xs text-ink-soft">{s.p}</p>
                <div className="mt-3">
                  <StatRow label="Disponible" value={`${s.v}%`} />
                  <ProgressBar value={s.v} tone={s.v > 70 ? "green" : s.v > 50 ? "wheat" : "earth"} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </DashboardLayout>
  );
}