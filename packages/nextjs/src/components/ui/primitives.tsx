"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DailyReportStatus } from "@/api/client";

export type Tone = "green" | "earth" | "wheat" | "slate";

export const toneBox: Record<Tone, string> = {
  green: "bg-agro-green/10 text-agro-green",
  earth: "bg-agro-earth/15 text-agro-earth-dark",
  wheat: "bg-agro-wheat/15 text-agro-earth-dark",
  slate: "bg-base-subtle text-ink-soft",
};

export const toneBadge: Record<Tone, string> = {
  green: "bg-agro-green/10 text-agro-green-dark",
  earth: "bg-agro-earth/15 text-agro-earth-dark",
  wheat: "bg-agro-wheat/15 text-agro-earth-dark",
  slate: "bg-base-subtle text-ink-soft",
};

/** IconTile: caja redondeada con icono, tono establecido. */
export function IconTile({
  tone = "green",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneBox[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

/** Badge: etiqueta pequeña de estado lateral. */
export function Badge({
  tone = "slate",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneBadge[tone]}`}
    >
      {children}
    </span>
  );
}

/** Card: contenedor base del sistema. */
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-card-lg border border-agro-border bg-card shadow-card transition-all hover:shadow-card-hover ${className}`}
    >
      {children}
    </div>
  );
}

/** CardHeader: encabezado con titulo, subtitulo y accion opcional a la derecha. */
export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-agro-border px-5 py-4">
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** PageHeader: encabezado superior de una pagina de modulo. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariant: Record<ButtonVariant, string> = {
  primary: "bg-agro-green text-white shadow-sm hover:bg-agro-green-dark",
  secondary:
    "border border-agro-border bg-card text-ink shadow-sm hover:bg-base-subtle hover:border-agro-border-strong",
  danger: "bg-agro-earth-dark text-white shadow-sm hover:bg-agro-earth",
  ghost: "text-ink-soft hover:bg-base-subtle hover:text-ink",
};

/** Button primario (estilo agro). El default conserva el look original. */
export function Button({
  children,
  onClick,
  className = "",
  type = "button",
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariant[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

const statusMeta: Record<DailyReportStatus, { label: string; tone: Tone; dot: string }> = {
  PENDIENTE_APROBACION: { label: "Pendiente", tone: "wheat", dot: "bg-agro-wheat" },
  APROBADO: { label: "Aprobado", tone: "green", dot: "bg-agro-green" },
  RECHAZADO: { label: "Rechazado", tone: "earth", dot: "bg-agro-earth" },
};

/** StatusBadge: estado de un parte de trabajo con color semántico. */
export function StatusBadge({
  status,
  className = "",
}: {
  status: DailyReportStatus;
  className?: string;
}) {
  const meta = statusMeta[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneBadge[meta.tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Overlay primitives                                                  */
/* ------------------------------------------------------------------ */

function Overlay({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(<>{children}</>, document.body);
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Cerrar"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-base-subtle hover:text-ink"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

/** Drawer: panel lateral para detalle master-detail. Se monta en un portal. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  footer,
  widthClass = "max-w-2xl",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  widthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <Overlay open={open} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
        <button
          type="button"
          aria-label="Cerrar panel"
          onClick={onClose}
          className="animate-fade-in absolute inset-0 bg-agro-green-deep/40 backdrop-blur-sm"
        />
        <div
          className={`animate-drawer-in relative z-10 flex h-full w-full ${widthClass} flex-col border-l border-agro-border bg-card shadow-float`}
        >
          <header className="flex items-start justify-between gap-3 border-b border-agro-border px-5 py-4">
            <div>
              <h3 className="font-semibold text-ink">{title}</h3>
              {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
            </div>
            <CloseButton onClose={onClose} />
          </header>

          <div className="flex-1 overflow-y-auto">{children}</div>

          {footer && (
            <footer className="border-t border-agro-border bg-base-subtle/40 px-5 py-4">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </Overlay>
  );
}

/** Modal: diálogo centrado reutilizable. Se monta en un portal. */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  widthClass = "max-w-lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  widthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <Overlay open={open} onClose={onClose}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          aria-label="Cerrar diálogo"
          onClick={onClose}
          className="animate-fade-in absolute inset-0 bg-agro-green-deep/40 backdrop-blur-sm"
        />
        <div
          className={`animate-fade-in-up relative z-10 flex w-full ${widthClass} max-h-[90vh] flex-col overflow-hidden rounded-card-lg border border-agro-border bg-card shadow-float`}
        >
          <header className="flex items-start justify-between gap-3 border-b border-agro-border px-5 py-4">
            <div>
              <h3 className="font-semibold text-ink">{title}</h3>
              {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
            </div>
            <CloseButton onClose={onClose} />
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="border-t border-agro-border bg-base-subtle/40 px-5 py-4">{footer}</footer>
          )}
        </div>
      </div>
    </Overlay>
  );
}

/** StatRow: fila compacta de dato/valor (para tablas e inventarios). */
export function StatRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

/** ProgressBar: barra de progreso con marco de tono. */
export function ProgressBar({
  value,
  tone = "green",
  className = "",
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const bar: Record<Tone, string> = {
    green: "bg-agro-green",
    earth: "bg-agro-earth",
    wheat: "bg-agro-wheat",
    slate: "bg-ink-faint",
  };
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-base-subtle ${className}`}>
      <div
        className={`h-full rounded-full ${bar[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** TabButton: pestana de selector. */
export function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-agro-green/10 text-agro-green-deep"
          : "text-ink-soft hover:bg-base-subtle hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** EmptyState: bloque para espacios sin datos aun. */
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-subtle text-ink-faint">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-ink-soft">{subtitle}</p>}
    </div>
  );
}

/** HeroBand: banner superior de un modulo con color de marca.
 *  Rompe el patron "todo cards" dandole peso visual y jerarquia a la pagina. */
export function HeroBand({
  kicker,
  title,
  description,
  actions,
  icon,
}: {
  kicker: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="hero-band mb-6 flex flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-8">
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-ink ring-1 ring-white/30">
            {icon}
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{kicker}</p>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-white">{title}</h2>
          <p className="mt-1 max-w-xl text-sm text-white/80">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}