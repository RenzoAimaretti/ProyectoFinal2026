"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  changePassword,
  updateMyClient,
  updateStoredUser,
} from "@/api/client";
import { Button } from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { LogoWordmark } from "@/components/ui/logo";
import { homePathForRole } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";

function apiMessage(body: unknown): string | null {
  if (body && typeof body === "object" && "message" in body) {
    const raw = (body as { message?: unknown }).message;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) {
      const joined = raw
        .filter((m): m is string => typeof m === "string")
        .join(" ");
      return joined.length > 0 ? joined : null;
    }
  }
  return null;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const message = apiMessage(err.body);
    if (err.status === 401) return message ?? "La contraseña actual es incorrecta.";
    if (err.status === 400) return message ?? "Revisá los datos ingresados.";
    if (err.status === 404) return "Tu usuario no está vinculado a un cliente.";
    return `No pudimos completar la operación (código ${err.status}).`;
  }
  return "No pudimos conectar con el servidor. Revisá tu conexión.";
}

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, ready, isAuthenticated } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: unauthenticated -> login; already-onboarded -> home.
  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && !user.mustChangePassword) {
      router.replace(homePathForRole(user.role));
    }
  }, [ready, isAuthenticated, user, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (user && !user.mustChangePassword) return;

    if (!passwordChanged && !currentPassword) {
      setError("Ingresá tu contraseña actual.");
      return;
    }
    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!phone.trim()) {
      setError("Ingresá tu teléfono.");
      return;
    }
    if (!address.trim()) {
      setError("Ingresá tu dirección.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (!passwordChanged) {
        await changePassword(currentPassword, newPassword);
        // Reflect the change immediately so the guard never traps the user if
        // the profile update below fails and we stay on this screen.
        updateStoredUser({ mustChangePassword: false });
        setPasswordChanged(true);
      }
      await updateMyClient({ phone: phone.trim(), address: address.trim() });
      updateStoredUser({ mustChangePassword: false });
      toast.success("Datos actualizados", "Tu cuenta quedó lista para usar.");
      router.replace(homePathForRole(user?.role));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !isAuthenticated || (user && !user.mustChangePassword)) {
    return (
      <div className="app-canvas flex min-h-screen items-center justify-center p-4">
        <Spinner label="Cargando…" />
      </div>
    );
  }

  return (
    <div className="app-canvas flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="animate-fade-in-up w-full max-w-xl rounded-card-lg border border-agro-border bg-card p-8 shadow-float sm:p-10">
        <LogoWordmark size={40} subtitle="Trazabilidad agropecuaria" />

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">
          Completá tu cuenta
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Antes de continuar, cambiá la contraseña temporal y cargá tu teléfono y
          dirección.
        </p>

        <form className="mt-7 space-y-4" onSubmit={onSubmit}>
          {passwordChanged ? (
            <Alert tone="info" title="Contraseña actualizada">
              Ya cambiaste tu contraseña. Terminá de cargar tus datos de contacto.
            </Alert>
          ) : (
            <TextField
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="La que usaste para ingresar"
              disabled={submitting}
            />
          )}

          <TextField
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="Mínimo 8 caracteres."
            disabled={submitting}
          />

          <TextField
            label="Repetir nueva contraseña"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
          />

          <TextField
            label="Teléfono"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: +54 9 11 5555 5555"
            disabled={submitting}
          />

          <TextField
            label="Dirección"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Ruta 5 km 120, Chivilcoy"
            disabled={submitting}
          />

          {error && <Alert tone="error">{error}</Alert>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Guardando…" : "Guardar y continuar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
