// Brand identity: SVG logomark + wordmark.
//
// The mark is an abstract "lot + leaf" glyph: a rounded field tile (deep forest)
// with geometric furrows and a leaf whose halves graduate from olive to warm
// wheat. Colors read from the design tokens so the mark stays coherent across
// light and dark surfaces.

export type LogoMarkProps = {
  /** Rendered size in pixels (square). */
  size?: number;
  /** Extra classes applied to the svg element. */
  className?: string;
  /** Accessible label. When omitted the mark is decorative. */
  label?: string;
};

export function LogoMark({ size = 40, className = "", label }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id="agro-mark-tile" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--color-agro-forest, #24402c)" }} />
          <stop
            offset="1"
            style={{ stopColor: "var(--color-agro-green-deep, #1a3323)" }}
          />
        </linearGradient>
        <linearGradient id="agro-mark-leaf" x1="14" y1="32" x2="34" y2="10" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--color-agro-olive, #6b8f4e)" }} />
          <stop
            offset="1"
            style={{ stopColor: "var(--color-agro-wheat, #cfa43c)" }}
          />
        </linearGradient>
      </defs>

      {/* Field tile */}
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#agro-mark-tile)" />
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="13"
        stroke="rgb(255 255 255 / 0.16)"
        strokeWidth="1"
      />

      {/* Furrows */}
      <path
        d="M10 34h9M10 39h15"
        stroke="rgb(255 255 255 / 0.24)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Leaf: two halves meeting at tip and base */}
      <path
        d="M24 8.5c6.6 3.4 10.2 7.9 10.2 13.1C34.2 28 29.6 32 24 32s-10.2-4-10.2-10.4C13.8 16.4 17.4 11.9 24 8.5z"
        fill="url(#agro-mark-leaf)"
      />
      {/* Midrib + veins */}
      <path
        d="M24 31.5V11"
        stroke="rgb(16 26 18 / 0.4)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M24 17.5l5.4-3.2M24 22.5l-5.4-3.2M24 27l4.2-2.4"
        stroke="rgb(16 26 18 / 0.32)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type LogoWordmarkProps = {
  /** Mark size in pixels. */
  size?: number;
  /** Brand name. Defaults to the product name. */
  title?: string;
  /** Optional tagline rendered under the name. */
  subtitle?: string;
  /** `inverse` is meant for dark surfaces (e.g. the sidebar). */
  tone?: "default" | "inverse";
  className?: string;
};

export function LogoWordmark({
  size = 40,
  title = "Agro Trazabilidad",
  subtitle,
  tone = "default",
  className = "",
}: LogoWordmarkProps) {
  const nameClass =
    tone === "inverse"
      ? "text-white"
      : "text-ink";
  const subClass =
    tone === "inverse"
      ? "text-white/55"
      : "text-ink-faint";

  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={size} />
      <span className="flex min-w-0 flex-col">
        <span
          className={`font-display truncate text-[15px] font-semibold leading-tight tracking-tight ${nameClass}`}
        >
          {title}
        </span>
        {subtitle && (
          <span className={`text-[10px] font-medium uppercase tracking-[0.22em] ${subClass}`}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
