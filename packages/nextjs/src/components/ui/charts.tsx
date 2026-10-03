"use client";

// Design-system data-visualization kit.
//
// Everything here is dependency-free: hand-built, responsive SVG that uses the
// design tokens (CSS variables) so charts stay coherent in light and dark mode.
//
// Layers:
// - Micro charts (backward compatible): `Sparkline`, `Donut`, `AreaLine`.
// - Designed charts: `TrendChart` (multi-series area) and `BarChart` (grouped
//   bars), both responsive, with real axis labels, gridlines, gradient fills,
//   hover tooltips and designed empty states.
// - Illustrative SVG: `WindRose`, `SatelliteMap`.
//
// Palette is colorblind-safe (green / terracotta / blue / wheat) so series stay
// distinguishable without relying on hue alone.

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type Segment = { label: string; value: number; color: string };

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Colorblind-safe series palette (tokens resolved at runtime). */
export const CHART_COLORS = [
  "var(--color-agro-green)",
  "var(--color-agro-earth)",
  "var(--semantic-info)",
  "var(--color-agro-wheat)",
] as const;

function seriesColor(color: string | undefined, index: number): string {
  return color ?? CHART_COLORS[index % CHART_COLORS.length];
}

const numberFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function fmtDefault(value: number): string {
  return numberFmt.format(value);
}

/** Rounds a raw magnitude up to a 1/2/5 x 10^n axis step. */
function niceStep(raw: number): number {
  const safe = raw > 0 ? raw : 1;
  const pow = Math.pow(10, Math.floor(Math.log10(safe)));
  const norm = safe / pow;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * pow;
}

function smoothPath(points: readonly (readonly [number, number])[]): string {
  return points.reduce((acc, [x, y], i) => {
    if (i === 0) return `M ${x},${y}`;
    const [px, py] = points[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C ${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
}

/** Measures an element's pixel width and keeps it in sync on resize. */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** Tiny legend rendered as HTML so it stays crisp and wraps naturally. */
function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span
            className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/5"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-medium">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-agro-border bg-base-subtle/40 px-6 py-10 text-center">
      <svg
        className="h-7 w-7 text-ink-faint"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3v18h18" />
        <path d="M7 15l3-4 3 2 4-6" />
      </svg>
      <p className="text-sm text-ink-soft">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Micro charts                                                        */
/* ------------------------------------------------------------------ */

/** Sparkline: mini trend line with a soft gradient fill and rounded caps. */
export function Sparkline({
  data,
  color = "var(--color-agro-green)",
  className = "",
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  const rawId = useId();
  const gradientId = `spark-${rawId.replace(/:/g, "")}`;

  if (data.length === 0) return null;

  const w = 120;
  const h = 36;
  const min = data.length > 0 ? Math.min(...data) : 0;
  const max = data.length > 0 ? Math.max(...data) : 0;
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pts[0][0]},${h} ${line} ${pts[pts.length - 1][0]},${h}`;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.34 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {pts.length > 1 && <polygon points={area} fill={`url(#${gradientId})`} />}
      {pts.length > 1 && (
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle cx={last[0]} cy={last[1]} r={4.5} fill={color} opacity={0.18} />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  );
}

/** Donut: proportion ring with an optional center slot. */
export function Donut({
  segments,
  size = 132,
  thickness = 16,
  center,
  className = "",
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
  className?: string;
}) {
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const visible = segments.filter((s) => s.value > 0);
  const multi = visible.length > 1;
  const gap = multi ? Math.min(10, c * 0.012) : 0;
  let offset = 0;

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-subtle)"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((s, i) => {
            const value = Math.max(0, s.value);
            if (value === 0) return null;
            const len = (value / total) * c;
            const arc = Math.max(0.001, len - gap);
            const dash = `${arc} ${c - arc}`;
            const start = offset;
            offset += len;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={dash}
                strokeDashoffset={-start}
                strokeLinecap={multi ? "butt" : "round"}
              />
            );
          })}
      </svg>
      {center && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {center}
        </div>
      )}
    </div>
  );
}

/** AreaLine: compact smooth line with a soft gradient area. */
export function AreaLine({
  data,
  color = "var(--color-agro-green)",
  height = 96,
  className = "",
}: {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const rawId = useId();
  const gradientId = `area-${rawId.replace(/:/g, "")}`;
  if (data.length === 0) return null;
  const w = 100;
  const h = height > 0 ? height : 96;
  const min = data.length > 0 ? Math.min(...data) : 0;
  const max = data.length > 0 ? Math.max(...data) : 0;
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });
  const d = smoothPath(pts);
  const area = `${d} L ${pts[pts.length - 1][0]},${h} L ${pts[0][0]},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Designed charts                                                     */
/* ------------------------------------------------------------------ */

export type ChartSeries = {
  key: string;
  label: string;
  values: number[];
  /** CSS color; defaults to the colorblind-safe palette by index. */
  color?: string;
};

export type TrendChartProps = {
  /** X-axis labels; one per data point. */
  labels: string[];
  series: ChartSeries[];
  /** Plot height in pixels (axis labels included). */
  height?: number;
  /** Optional unit appended to values, e.g. "ha" or "hs". */
  unit?: string;
  /** Custom value formatter for the axis and tooltip. */
  formatValue?: (value: number) => string;
  /** Copy shown when there is nothing to plot. */
  emptyMessage?: string;
  ariaLabel?: string;
  className?: string;
};

/**
 * TrendChart: responsive multi-series area chart.
 * Real y-axis ticks, subtle gridlines, gradient fills, hover guide + tooltip.
 */
export function TrendChart({
  labels,
  series,
  height = 240,
  unit,
  formatValue,
  emptyMessage = "Sin datos para el período.",
  ariaLabel = "Gráfico de tendencia",
  className = "",
}: TrendChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const format = formatValue ?? fmtDefault;
  const gradientPrefix = `trend-${useId().replace(/:/g, "")}`;

  const n = labels.length;
  const pad = { top: 18, right: 18, bottom: 30, left: 48 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = Math.max(0, height - pad.top - pad.bottom);

  const allValues = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const rawMax = allValues.length > 0 ? Math.max(...allValues, 0) : 0;
  const rawMin = allValues.length > 0 ? Math.min(...allValues, 0) : 0;
  const hasSignal = allValues.some((v) => v !== 0);
  const allInt = allValues.length > 0 && allValues.every((v) => Number.isInteger(v));
  const step = allInt ? Math.max(1, Math.ceil(niceStep(rawMax / 4))) : niceStep(rawMax / 4);
  const maxY = step * 4;
  const tickCount = 4;
  const ready = n > 0 && series.length > 0 && width > 0 && hasSignal;

  const xAt = (i: number) => pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (value: number) => {
    const span = maxY - rawMin || 1;
    return pad.top + innerH - ((value - rawMin) / span) * innerH;
  };

  const lines = useMemo(
    () =>
      series.map((s, i) => {
        const color = seriesColor(s.color, i);
        const pts = labels.map((_, idx) => [xAt(idx), yAt(s.values[idx] ?? 0)] as const);
        const path = smoothPath(pts);
        const area = `${path} L ${pts[pts.length - 1]?.[0] ?? pad.left},${pad.top + innerH} L ${
          pts[0]?.[0] ?? pad.left
        },${pad.top + innerH} Z`;
        return { series: s, color, path, area };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- geometry is derived from the values below
    [series, labels, width, height, rawMin, maxY],
  );

  const legend = series.map((s, i) => ({ label: s.label, color: seriesColor(s.color, i) }));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left - pad.left;
    const idx = n === 1 ? 0 : Math.round((relX / (innerW || 1)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  };

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      {!ready ? (
        <ChartEmpty message={width === 0 ? "Cargando…" : emptyMessage} />
      ) : (
        <>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={ariaLabel}
            className="touch-none"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              {lines.map((l, i) => (
                <linearGradient key={l.series.key} id={`${gradientPrefix}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: l.color, stopOpacity: 0.28 }} />
                  <stop offset="100%" style={{ stopColor: l.color, stopOpacity: 0.02 }} />
                </linearGradient>
              ))}
            </defs>

            {/* Gridlines + y-axis labels */}
            {Array.from({ length: tickCount + 1 }).map((_, t) => {
              const value = (maxY / tickCount) * t;
              const y = yAt(value);
              return (
                <g key={t}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={pad.left + innerW}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth={t === 0 ? 1 : 0.8}
                    strokeDasharray={t === 0 ? undefined : "3 5"}
                  />
                  <text
                    x={pad.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={11}
                    fill="var(--text-muted)"
                  >
                    {format(value)}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels (thinned to stay legible) */}
            {labels.map((label, i) => {
              const stride = Math.max(1, Math.ceil(n / 7));
              if (i % stride !== 0 && i !== n - 1) return null;
              return (
                <text
                  key={`${label}-${i}`}
                  x={xAt(i)}
                  y={pad.top + innerH + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--text-muted)"
                >
                  {label}
                </text>
              );
            })}

            {/* Series: gradient area + smooth line */}
            {lines.map((l) => (
              <g key={l.series.key}>
                <path d={l.area} fill={`url(#${gradientPrefix}-${lines.indexOf(l)})`} />
                <path
                  d={l.path}
                  fill="none"
                  stroke={l.color}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}

            {/* Hover guide + points */}
            {hover !== null && (
              <g>
                <line
                  x1={xAt(hover)}
                  y1={pad.top}
                  x2={xAt(hover)}
                  y2={pad.top + innerH}
                  stroke="var(--text-muted)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.7}
                />
                {lines.map((l) => (
                  <circle
                    key={l.series.key}
                    cx={xAt(hover)}
                    cy={yAt(l.series.values[hover] ?? 0)}
                    r={4.5}
                    fill="var(--bg-card)"
                    stroke={l.color}
                    strokeWidth={2.4}
                  />
                ))}
              </g>
            )}
          </svg>

          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-[9rem] rounded-lg border border-agro-border bg-card px-3 py-2 shadow-pop"
              style={{
                left: Math.max(76, Math.min(width - 76, xAt(hover))),
                transform: "translateX(-50%)",
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {labels[hover]}
              </p>
              <ul className="mt-1 space-y-0.5">
                {series.map((s, i) => (
                  <li key={s.key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-ink-soft">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: seriesColor(s.color, i) }}
                      />
                      {s.label}
                    </span>
                    <span className="text-numeric font-semibold text-ink">
                      {format(s.values[hover] ?? 0)}
                      {unit ? <span className="ml-0.5 font-normal text-ink-faint">{unit}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {legend.length > 1 && (
            <div className="mt-1 pl-12">
              <ChartLegend items={legend} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type BarChartProps = {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  unit?: string;
  formatValue?: (value: number) => string;
  emptyMessage?: string;
  ariaLabel?: string;
  className?: string;
};

/** BarChart: responsive grouped bar chart with axis, gridlines and tooltip. */
export function BarChart({
  labels,
  series,
  height = 220,
  unit,
  formatValue,
  emptyMessage = "Sin datos para el período.",
  ariaLabel = "Gráfico de barras",
  className = "",
}: BarChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const format = formatValue ?? fmtDefault;

  const n = labels.length;
  const pad = { top: 18, right: 18, bottom: 30, left: 48 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = Math.max(0, height - pad.top - pad.bottom);

  const allValues = series
    .flatMap((s) => s.values)
    .filter((v) => Number.isFinite(v) && v >= 0);
  const rawMax = allValues.length > 0 ? Math.max(...allValues, 0) : 0;
  const hasSignal = allValues.some((v) => v !== 0);
  const allInt = allValues.length > 0 && allValues.every((v) => Number.isInteger(v));
  const step = allInt ? Math.max(1, Math.ceil(niceStep(rawMax / 4))) : niceStep(rawMax / 4);
  const maxY = step * 4;
  const ready = n > 0 && series.length > 0 && width > 0 && hasSignal;

  const groupW = n > 0 ? innerW / n : innerW;
  const bandW = Math.min(34, groupW * 0.68);
  const barW = bandW / Math.max(1, series.length);
  const baseline = pad.top + innerH;

  const legend = series.map((s, i) => ({ label: s.label, color: seriesColor(s.color, i) }));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left - pad.left;
    const idx = Math.floor(relX / (groupW || 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  };

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      {!ready ? (
        <ChartEmpty message={width === 0 ? "Cargando…" : emptyMessage} />
      ) : (
        <>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={ariaLabel}
            className="touch-none"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {Array.from({ length: 5 }).map((_, t) => {
              const value = (maxY / 4) * t;
              const y = pad.top + innerH - (value / (maxY || 1)) * innerH;
              return (
                <g key={t}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={pad.left + innerW}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth={t === 0 ? 1 : 0.8}
                    strokeDasharray={t === 0 ? undefined : "3 5"}
                  />
                  <text
                    x={pad.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={11}
                    fill="var(--text-muted)"
                  >
                    {format(value)}
                  </text>
                </g>
              );
            })}

            {hover !== null && (
              <rect
                x={pad.left + hover * groupW}
                y={pad.top}
                width={groupW}
                height={innerH}
                fill="var(--text-muted)"
                opacity={0.06}
                rx={6}
              />
            )}

            {labels.map((label, i) => {
              const groupCx = pad.left + i * groupW + groupW / 2;
              const groupLeft = groupCx - bandW / 2;
              return (
                <g key={`${label}-${i}`}>
                  {series.map((s, si) => {
                    const value = Math.max(0, s.values[i] ?? 0);
                    const barH = (value / (maxY || 1)) * innerH;
                    return (
                      <rect
                        key={s.key}
                        x={groupLeft + si * barW}
                        y={baseline - barH}
                        width={Math.max(1, barW - 2)}
                        height={Math.max(0, barH)}
                        rx={Math.min(4, barW / 2)}
                        fill={seriesColor(s.color, si)}
                        opacity={hover === null || hover === i ? 1 : 0.45}
                      />
                    );
                  })}
                  <text
                    x={groupCx}
                    y={baseline + 18}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--text-muted)"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>

          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-[9rem] rounded-lg border border-agro-border bg-card px-3 py-2 shadow-pop"
              style={{
                left: Math.max(
                  76,
                  Math.min(width - 76, pad.left + hover * groupW + groupW / 2),
                ),
                transform: "translateX(-50%)",
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {labels[hover]}
              </p>
              <ul className="mt-1 space-y-0.5">
                {series.map((s, i) => (
                  <li key={s.key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-ink-soft">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: seriesColor(s.color, i) }}
                      />
                      {s.label}
                    </span>
                    <span className="text-numeric font-semibold text-ink">
                      {format(s.values[hover] ?? 0)}
                      {unit ? <span className="ml-0.5 font-normal text-ink-faint">{unit}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {legend.length > 1 && (
            <div className="mt-1 pl-12">
              <ChartLegend items={legend} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Illustrative SVG                                                    */
/* ------------------------------------------------------------------ */

/** WindRose: rosa de los vientos con intensidad por dirección. */
export function WindRose({
  values,
  size = 88,
}: {
  values: Record<string, number>;
  size?: number;
}) {
  const dirs = Object.keys(values);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {[34, 46, 58].map((rr) => (
        <circle key={rr} cx={50} cy={50} r={rr} fill="none" stroke="var(--border)" strokeWidth={0.8} />
      ))}
      {dirs.map((d, i) => {
        const v = values[d];
        const ang = (i / dirs.length) * 360 - 90;
        const rad = (ang * Math.PI) / 180;
        const x1 = 50 + Math.cos(rad) * 30;
        const y1 = 50 + Math.sin(rad) * 30;
        const x2 = x1 + Math.cos(rad) * v;
        const y2 = y1 + Math.sin(rad) * v;
        return (
          <line
            key={d}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--color-agro-earth)"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        );
      })}
      <text x={50} y={50} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="var(--text-muted)">
        N
      </text>
    </svg>
  );
}

/** SatelliteMap: texto de campo satelital con parcelas superpuestas. */
export function SatelliteMap({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      {/* Textura de prado */}
      <defs>
        <radialGradient id="sat-glow" cx="40%" cy="30%" r="90%">
          <stop offset="0%" style={{ stopColor: "var(--color-agro-olive)" }} />
          <stop offset="45%" style={{ stopColor: "var(--color-agro-green)" }} />
          <stop offset="80%" style={{ stopColor: "var(--color-agro-forest)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-agro-green-deep)" }} />
        </radialGradient>
      </defs>
      <rect width={600} height={360} fill="url(#sat-glow)" />
      {/* Caminos/acequias */}
      <path d="M0 190 Q 150 210 300 195 T 600 200" fill="none" stroke="var(--color-agro-green-deep)" strokeWidth={7} strokeLinecap="round" />
      <path d="M260 0 Q 250 120 290 360" fill="none" stroke="var(--color-agro-green-deep)" strokeWidth={5} strokeLinecap="round" />
      {/* Parcelas con distinto índice NDVI */}
      <polygon points="60,40 250,50 240,175 50,160" fill="var(--color-agro-olive)" opacity={0.5} stroke="var(--color-agro-green-soft)" strokeWidth={2} />
      <polygon points="270,55 420,40 430,140 300,150" fill="var(--color-agro-green)" opacity={0.55} stroke="var(--color-agro-green-soft)" strokeWidth={2} />
      <polygon points="440,45 580,60 575,150 465,135" fill="var(--color-agro-ochre)" opacity={0.45} stroke="var(--color-agro-green-soft)" strokeWidth={2} />
      <polygon points="50,180 245,190 230,340 60,320" fill="var(--color-agro-green)" opacity={0.5} stroke="var(--color-agro-green-soft)" strokeWidth={2} />
      <polygon points="300,175 430,160 450,300 320,320" fill="var(--color-agro-olive)" opacity={0.5} stroke="var(--color-agro-green-soft)" strokeWidth={2} />
      <polygon points="475,175 585,170 580,300 470,330" fill="var(--color-agro-earth)" opacity={0.4} stroke="var(--color-agro-green-soft)" strokeWidth={2} />
      {/* Overlay de calor sutíl */}
      <polygon points="300,175 430,160 450,300 320,320" fill="var(--color-agro-mustard)" opacity={0.12} />
    </svg>
  );
}
