// Inline loading indicator.

export type SpinnerSize = "sm" | "md" | "lg";

const sizeClass: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function Spinner({
  size = "md",
  label,
  className = "",
}: {
  size?: SpinnerSize;
  /** Optional visible label next to the spinner. */
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 ${className}`}>
      <svg className={`${sizeClass[size]} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
        <path className="opacity-90" d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      </svg>
      {label ? <span className="text-sm text-ink-soft">{label}</span> : <span className="sr-only">Cargando</span>}
    </span>
  );
}
