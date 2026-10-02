"use client";

// User feedback primitives: toasts (provider + hook + viewport) and inline alerts.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertIcon, CheckIcon, XIcon } from "./icons";

function InfoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export type ToastTone = "success" | "error" | "info";

export type ToastInput = {
  message: string;
  tone?: ToastTone;
  title?: string;
  /** Milliseconds before auto-dismiss. Use 0 to keep it until dismissed. */
  duration?: number;
};

export type ToastRecord = {
  id: number;
  message: string;
  tone: ToastTone;
  title?: string;
  duration: number;
};

type ToastContextValue = {
  toasts: ToastRecord[];
  toast: (input: ToastInput) => number;
  success: (message: string, title?: string) => number;
  error: (message: string, title?: string) => number;
  info: (message: string, title?: string) => number;
  dismiss: (id: number) => void;
};

const DEFAULT_DURATION = 4500;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = counter.current + 1;
    counter.current = id;
    const record: ToastRecord = {
      id,
      message: input.message,
      tone: input.tone ?? "info",
      title: input.title,
      duration: input.duration ?? DEFAULT_DURATION,
    };
    setToasts((prev) => [...prev, record]);
    return id;
  }, []);

  const success = useCallback(
    (message: string, title?: string) => toast({ message, tone: "success", title }),
    [toast],
  );
  const error = useCallback(
    (message: string, title?: string) => toast({ message, tone: "error", title }),
    [toast],
  );
  const info = useCallback(
    (message: string, title?: string) => toast({ message, tone: "info", title }),
    [toast],
  );

  const value = useMemo(
    () => ({ toasts, toast, success, error, info, dismiss }),
    [toasts, toast, success, error, info, dismiss],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

const toastTone: Record<ToastTone, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <CheckIcon className="h-5 w-5" />, accent: "text-success" },
  error: { icon: <AlertIcon className="h-5 w-5" />, accent: "text-danger" },
  info: { icon: <InfoIcon />, accent: "text-ink-soft" },
};

function ToastItem({
  record,
  onDismiss,
}: {
  record: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    if (record.duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(record.id), record.duration);
    return () => window.clearTimeout(timer);
  }, [record.id, record.duration, onDismiss]);

  const tone = toastTone[record.tone];

  return (
    <div
      role="status"
      className="animate-fade-in-up pointer-events-auto flex items-start gap-3 rounded-card-lg border border-agro-border bg-card px-4 py-3 shadow-float"
    >
      <span className={`mt-0.5 shrink-0 ${tone.accent}`}>{tone.icon}</span>
      <div className="min-w-0 flex-1">
        {record.title && <p className="text-sm font-semibold text-ink">{record.title}</p>}
        <p className={`text-sm ${record.title ? "mt-0.5 text-ink-soft" : "font-medium text-ink"}`}>
          {record.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(record.id)}
        aria-label="Cerrar notificación"
        className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-base-subtle hover:text-ink"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Fixed viewport that renders the active toasts. Mount once, inside ToastProvider. */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((record) => (
        <ToastItem key={record.id} record={record} onDismiss={dismiss} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alert                                                               */
/* ------------------------------------------------------------------ */

export type AlertTone = "info" | "success" | "warning" | "error";

const alertTone: Record<
  AlertTone,
  { box: string; icon: string; iconNode: React.ReactNode }
> = {
  info: { box: "border-agro-border bg-base-subtle text-ink", icon: "text-ink-soft", iconNode: <InfoIcon /> },
  success: {
    box: "border-success/30 bg-success-soft text-success",
    icon: "text-success",
    iconNode: <CheckIcon />,
  },
  warning: {
    box: "border-warning/30 bg-warning-soft text-warning",
    icon: "text-warning",
    iconNode: <AlertIcon />,
  },
  error: {
    box: "border-danger/30 bg-danger-soft text-danger",
    icon: "text-danger",
    iconNode: <AlertIcon />,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  onDismiss,
  className = "",
}: {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const meta = alertTone[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${meta.box} ${className}`}
    >
      <span className={`mt-0.5 shrink-0 ${meta.icon}`}>{meta.iconNode}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
