"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, getStoredUser, getToken, login } from "@/api/client";
import { Button } from "@/components/ui/primitives";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Skip the form.
  useEffect(() => {
    if (getStoredUser() && getToken()) router.replace(nextPath);
  }, [router, nextPath]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace(nextPath);
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
    <div className="app-canvas flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="animate-fade-in-up grid w-full max-w-4xl overflow-hidden rounded-card-lg border border-agro-border bg-card shadow-float lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-agro-green-deep via-agro-green to-agro-green-dark p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-agro-wheat/20 blur-3xl"
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-sm font-bold ring-1 ring-white/25">
                AG
              </div>
              <span className="text-lg font-semibold tracking-tight">Agro Trazabilidad</span>
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-white/70">
              Bandeja de aprobación
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
              Los partes del campo, revisados y aprobados en un solo lugar.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
              Trazabilidad multi-tenant de labores, insumos y fotos cargadas desde el móvil,
              listas para validar por el administrador.
            </p>
          </div>
          <p className="relative mt-10 text-xs text-white/60">
            Eliggi · Eliggi Tufoni · Eliggi Néstor
          </p>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          <div className="lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-agro-green text-sm font-bold text-white shadow-card">
                AG
              </div>
              <span className="font-semibold tracking-tight text-ink">Agro Trazabilidad</span>
            </div>
          </div>

          <h2 className="mt-6 text-2xl font-bold tracking-tight text-ink lg:mt-0">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Accedé con tu cuenta para gestionar los partes de trabajo.
          </p>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-ink-faint">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@agro.com"
                className="w-full rounded-lg border border-agro-border bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-agro-green/40"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-ink-faint">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-agro-border bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-agro-green/40"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-agro-earth/40 bg-agro-earth/10 px-3 py-2.5 text-sm text-agro-earth-dark"
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            <Link href="/" className="font-medium text-agro-green-dark hover:underline">
              Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="app-canvas flex min-h-screen items-center justify-center p-4">
      <div className="flex items-center gap-2.5 text-sm text-ink-soft">
        <span className="h-2 w-2 animate-pulse-soft rounded-full bg-agro-green" />
        Cargando…
      </div>
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
