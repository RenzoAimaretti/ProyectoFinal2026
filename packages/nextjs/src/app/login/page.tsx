"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, login } from "@/api/client";
import { Alert } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { LogoMark } from "@/components/ui/logo";
import { homePathForRole } from "@/components/ui/nav";

/**
 * Operate brand lockup. Uses the shared LogoMark (whose tokens are re-pointed
 * to the survey palette inside `.operate-world`) plus plain text — never the
 * incumbent `LogoWordmark`, which carries the retired forest/Fraunces look.
 */
function BrandLockup({ subtitle = "Carta de suelos" }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={34} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold tracking-tight">Agro Trazabilidad</span>
        <span className="op-label">{subtitle}</span>
      </span>
    </span>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Restores the intended path, falling back to the role's home. */
  function destination(role?: string | null): string {
    if (nextParam && nextParam !== "/dashboard") return nextParam;
    return homePathForRole(role);
  }

  // The login form is always visible: a signed-in visitor can switch accounts
  // here instead of being bounced away. Route guards still protect the app.

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await login(email.trim(), password);
      router.replace(
        result.user.mustChangePassword
          ? "/onboarding"
          : destination(result.user.role),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Email o contraseña incorrectos.");
      } else if (err instanceof ApiError) {
        setError(`No pudimos iniciar sesión (código ${err.status}). Intentá nuevamente.`);
      } else {
        setError("No pudimos conectar con el servidor. Revisá tu conexión.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="operate-world op-canvas flex min-h-screen items-center justify-center p-4 sm:p-6">
      <a href="#contenido" className="op-skip">
        Saltar al contenido
      </a>
      <main
        id="contenido"
        tabIndex={-1}
        className="op-plate animate-fade-in-up grid w-full max-w-4xl overflow-hidden lg:grid-cols-2"
      >
        {/* Legend rail: the auth screen keeps the survey world's signature bar. */}
        <div className="op-rail relative hidden flex-col justify-between p-9 lg:flex">
          <BrandLockup />
          <div className="mt-10">
            <p className="op-label">Bandeja de aprobación</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight">
              Los partes del campo, revisados y aprobados en un solo lugar.
            </h1>
            <p className="op-rail-sub mt-3 max-w-sm leading-relaxed">
              Trazabilidad de labores, insumos y fotos cargadas offline desde el móvil,
              listas para validar por el administrador.
            </p>
          </div>
          <p className="op-rail-sub mt-10">Eliggi · Eliggi Tufoni · Eliggi Néstor</p>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          <div className="lg:hidden">
            <BrandLockup />
          </div>

          {/* The brand panel (and its h1) is desktop-only, so the form panel
              supplies a heading on mobile to keep one h1 per viewport. */}
          <h1 className="sr-only lg:hidden">Iniciar sesión</h1>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-ink lg:mt-0">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Accedé con tu cuenta para gestionar los partes de trabajo.
          </p>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
            <TextField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@agro.com"
            />

            <TextField
              id="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && <Alert tone="error">{error}</Alert>}

            <button
              type="submit"
              disabled={submitting}
              className="op-btn op-btn--primary w-full"
            >
              {submitting ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            <Link
              href="/"
              className="font-medium text-ink underline decoration-agro-border underline-offset-4 transition-colors hover:decoration-ink"
            >
              Volver al inicio
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="operate-world op-canvas flex min-h-screen items-center justify-center p-4">
      <Spinner label="Cargando…" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
