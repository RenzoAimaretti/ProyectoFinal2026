"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, getStoredUser, getToken, login } from "@/api/client";
import { Button } from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { LogoWordmark } from "@/components/ui/logo";

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
            <LogoWordmark
              size={44}
              title="Agro Trazabilidad"
              subtitle="Trazabilidad agropecuaria"
              tone="inverse"
            />
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
            <LogoWordmark size={40} subtitle="Trazabilidad agropecuaria" />
          </div>

          <h2 className="mt-6 text-2xl font-bold tracking-tight text-ink lg:mt-0">Iniciar sesión</h2>
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
