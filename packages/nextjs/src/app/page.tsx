import Link from "next/link";

const features = [
  {
    title: "Mapa de campos",
    description: "Polígonos interactivos de lotes con estado por color.",
  },
  {
    title: "Partes de trabajo",
    description: "Aprobación de partes cargados desde el móvil en campo.",
  },
  {
    title: "Insumos por cliente",
    description: "Stock ingresado vs. consumido vs. sobrante por operador.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-base">
      {/* Glow decorativo de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-agro-green/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-agro-earth/10 blur-3xl"
      />

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-agro-green text-sm font-bold text-white shadow-card">
            AG
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">
            Agro Trazabilidad
          </span>
        </div>

        <nav className="hidden items-center gap-1 rounded-full bg-base-subtle p-1 sm:flex">
          <Link
            href="/dashboard"
            className="rounded-full bg-card px-4 py-1.5 text-sm font-medium text-ink shadow-sm"
          >
            Panel
          </Link>
          <Link
            href="#"
            className="rounded-full px-4 py-1.5 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Contacto
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-16 text-center animate-fade-in-up">
        <span className="rounded-full border border-agro-green/30 bg-agro-green/10 px-4 py-1.5 text-xs font-medium text-agro-green-dark">
          Multi-tenant · Eliggi / Eliggi Tufoni / Eliggi Néstor
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Agronegocios bajo control,{" "}
          <span className="bg-gradient-to-r from-agro-green to-agro-green-deep bg-clip-text text-transparent">
            desde el campo
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-ink-soft">
          Trazabilidad integral de campos, partes de trabajo e insumos. Una
          sola plataforma para planificar, seguir y rendir cada hectárea.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-agro-green px-7 text-sm font-semibold text-white shadow-card transition-all hover:bg-agro-green-dark hover:shadow-card-hover"
          >
            Ir al Dashboard
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5-5 5M6 10v4a2 2 0 002 2h8l0 0M6 10H4a2 2 0 00-2 2v0a2 2 0 002 2h2"
              />
            </svg>
          </Link>
          <Link
            href="#"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-agro-border bg-card px-7 text-sm font-semibold text-ink shadow-sm transition-all hover:border-agro-border-strong hover:bg-card-hover"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-card-lg border border-agro-border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <h3 className="font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{f.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}