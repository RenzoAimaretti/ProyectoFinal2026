"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DailyReportStatus } from "@/api/client";
import { useWorldClassName } from "./world";

export type Tone = "green" | "earth" | "wheat" | "slate";

export const toneBox: Record<Tone, string> = {
  green: "bg-agro-green/10 text-agro-green-text ring-1 ring-inset ring-agro-green/15",
  earth: "bg-agro-earth/12 text-agro-earth-text ring-1 ring-inset ring-agro-earth/15",
  wheat: "bg-agro-wheat/18 text-agro-wheat-text ring-1 ring-inset ring-agro-wheat/25",
  slate: "bg-base-subtle text-ink-soft ring-1 ring-inset ring-agro-border",
};

export const toneBadge: Record<Tone, string> = {
  green: "bg-agro-green/10 text-agro-green-text ring-1 ring-inset ring-agro-green/15",
  earth: "bg-agro-earth/12 text-agro-earth-text ring-1 ring-inset ring-agro-earth/15",
  wheat: "bg-agro-wheat/18 text-agro-wheat-text ring-1 ring-inset ring-agro-wheat/25",
  slate: "bg-base-subtle text-ink-soft ring-1 ring-inset ring-agro-border",
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
      className={`card-surface rounded-card-lg border border-agro-border bg-card shadow-card transition-[transform,box-shadow] hover:shadow-card-hover ${className}`}
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
        <h3 className="font-display font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariant: Record<ButtonVariant, string> = {
  primary: "btn-primary text-white",
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariant[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

export type StatusMeta = { label: string; tone: Tone; dot?: string };

/** Maps a status value to its display label, tone and optional dot class. */
export type StatusMap<S extends string = string> = Record<S, StatusMeta>;

/**
 * Default map so the existing `<StatusBadge status={dailyReport.status} />`
 * usage keeps working without passing `map`.
 */
export const DAILY_REPORT_STATUS_BADGE: StatusMap<DailyReportStatus> = {
  PENDIENTE_APROBACION: { label: "Pendiente", tone: "wheat", dot: "bg-agro-wheat" },
  APROBADO: { label: "Aprobado", tone: "green", dot: "bg-agro-green" },
  RECHAZADO: { label: "Rechazado", tone: "earth", dot: "bg-agro-earth" },
};

const toneDot: Record<Tone, string> = {
  green: "bg-agro-green",
  earth: "bg-agro-earth",
  wheat: "bg-agro-wheat",
  slate: "bg-ink-faint",
};

/**
 * Generic status badge. Pass `map` to describe any status enum:
 *   const RECEPTION_BADGE: StatusMap<ReceptionStatus> = { ... };
 *   <StatusBadge status={reception.status} map={RECEPTION_BADGE} />
 * When `map` is omitted and the status is a daily-report status, the default
 * map above is used. Unknown statuses fall back to a neutral badge.
 */
export function StatusBadge<S extends string>({
  status,
  map,
  className = "",
}: {
  status: S;
  map?: StatusMap<S>;
  className?: string;
}) {
  const meta: StatusMeta =
    (map as StatusMap | undefined)?.[status] ??
    (DAILY_REPORT_STATUS_BADGE as StatusMap)[status] ??
    { label: status, tone: "slate" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneBadge[meta.tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot ?? toneDot[meta.tone]}`} />
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
  // The active world travels through the React context chain even though the
  // portal mounts on document.body. Stamping it on the portal root carries the
  // world's tokens and scoped styles into the drawer/modal without hardcoding
  // the class into this shared primitive. Default "" keeps every surface
  // outside the dashboard unchanged.
  const worldClassName = useWorldClassName();

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
  return createPortal(
    worldClassName ? (
      <div className={worldClassName} style={{ display: "contents" }}>
        {children}
      </div>
    ) : (
      <>{children}</>
    ),
    document.body,
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Cerrar"
      className="-m-1 flex h-11 w-11 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-base-subtle hover:text-ink"
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
      <span className="text-numeric font-semibold text-ink">{value}</span>
    </div>
  );
}

/** ProgressBar: barra de progreso con marco de tono. */
export function ProgressBar({
  value,
  tone = "green",
  className = "",
  label,
}: {
  value: number;
  tone?: Tone;
  className?: string;
  /** Accessible name for the progress bar. */
  label?: string;
}) {
  const bar: Record<Tone, string> = {
    green: "bg-agro-green",
    earth: "bg-agro-earth",
    wheat: "bg-agro-wheat",
    slate: "bg-ink-faint",
  };
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-base-subtle ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full ${bar[tone]}`}
        style={{ width: `${clamped}%` }}
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

export type KpiDeltaDirection = "up" | "down" | "flat";

const kpiDeltaTone: Record<KpiDeltaDirection, string> = {
  up: "text-agro-green-text",
  down: "text-agro-earth-text",
  flat: "text-ink-soft",
};

/** KpiCard: métrica destacada con icono, valor y delta opcional. */
export function KpiCard({
  label,
  value,
  delta,
  deltaDirection = "flat",
  icon,
  tone = "green",
  hint,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  /** Short delta or hint text shown under the value. */
  delta?: string;
  deltaDirection?: KpiDeltaDirection;
  icon?: React.ReactNode;
  tone?: Tone;
  hint?: string;
  className?: string;
}) {
  const footer = delta ?? hint;
  return (
    <Card className={`edge-glow relative p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
          <p className="mt-2 font-display text-kpi text-numeric text-ink">{value}</p>
          {footer && (
            <p className={`mt-1 text-xs font-medium ${delta ? kpiDeltaTone[deltaDirection] : "text-ink-soft"}`}>
              {footer}
            </p>
          )}
        </div>
        {icon && (
          <IconTile tone={tone} className="h-11 w-11">
            {icon}
          </IconTile>
        )}
      </div>
    </Card>
  );
}