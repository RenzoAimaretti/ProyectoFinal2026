"use client";

// Sprint 3 integration widgets: local weather, wind, rain radar, official USD
// and the grain board. Hand-rolled on the existing design tokens/primitives —
// no component library. Every widget that consumes a degradable source surfaces
// its `stale` flag together with the `fetchedAt` timestamp (spec A8), so a
// cached value is never presented as a current one.

import type { ReactNode } from "react";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { AreaLine, WindRose } from "@/components/ui/charts";
import { AlertIcon } from "@/components/ui/icons";
import type {
  GrainPricesResponse,
  UsdRateResponse,
  WeatherHourlyPoint,
  WeatherResponse,
} from "@/api/client";

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const num1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

const num0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

const arsFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const fetchedAtFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const sourceDateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function fmtFetchedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fetchedAtFmt.format(d);
}

function fmtSourceDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : sourceDateFmt.format(d);
}

/** `YYYY-MM-DD` board date, rendered without a timezone shift. */
function fmtBoardDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return iso;
}

/* ------------------------------------------------------------------ */
/* Wind helpers                                                        */
/* ------------------------------------------------------------------ */

/** Ordered so index i maps to the sector WindRose draws at i/8 of a turn. */
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

function compassPoint(deg: number): (typeof COMPASS)[number] {
  const norm = ((deg % 360) + 360) % 360;
  return COMPASS[Math.round(norm / 45) % 8];
}

/**
 * A real wind rose over the hourly window: average speed per 8-sector bucket,
 * scaled against the dominant sector so the shape stays readable.
 */
function windRoseValues(hourly: WeatherHourlyPoint[]): Record<string, number> {
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const label of COMPASS) buckets.set(label, { sum: 0, count: 0 });

  for (const point of hourly) {
    const bucket = buckets.get(compassPoint(point.windDirectionDeg));
    if (!bucket) continue;
    bucket.sum += point.windSpeedKnots;
    bucket.count += 1;
  }

  const averages = COMPASS.map((label) => {
    const bucket = buckets.get(label);
    return bucket && bucket.count > 0 ? bucket.sum / bucket.count : 0;
  });
  const peak = Math.max(...averages, 1);

  const values: Record<string, number> = {};
  COMPASS.forEach((label, i) => {
    values[label] = averages[i] > 0 ? Math.max(5, (averages[i] / peak) * 17) : 0;
  });
  return values;
}

/* ------------------------------------------------------------------ */
/* Shared shell + degradation notice (spec A8)                         */
/* ------------------------------------------------------------------ */

type SourceInfo = {
  stale: boolean;
  fetchedAt: string;
  label?: string;
};

function SourceNote({ stale, fetchedAt, label }: SourceInfo) {
  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-faint">
      {stale ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 font-semibold text-warning ring-1 ring-inset ring-warning/30">
          <AlertIcon className="h-3.5 w-3.5" />
          Dato desactualizado
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 font-semibold text-success ring-1 ring-inset ring-success/25">
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          Al día
        </span>
      )}
      <span>
        Lectura <span className="op-num">{fmtFetchedAt(fetchedAt)}</span>
      </span>
      {label ? <span className="ml-auto">{label}</span> : null}
    </p>
  );
}

function WidgetShell({
  title,
  action,
  source,
  footer,
  className = "",
  children,
}: {
  title: string;
  action?: ReactNode;
  source?: SourceInfo | null;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={`flex flex-col overflow-hidden ${className}`}>
      <CardHeader title={title} action={action} />
      <div className="flex flex-1 flex-col gap-3 px-5 py-4">{children}</div>
      <div className="mt-auto space-y-1.5 border-t border-agro-border px-5 py-2.5">
        {footer}
        {source ? <SourceNote {...source} /> : null}
      </div>
    </Card>
  );
}

function WidgetState({
  loading,
  error,
  empty = "Sin datos para mostrar.",
}: {
  loading?: boolean;
  error?: string | null;
  empty?: string;
}) {
  if (loading) {
    return <div className="skeleton h-24 w-full" aria-hidden="true" />;
  }
  return <p className="text-sm text-ink-soft">{error ?? empty}</p>;
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="op-label">{label}</dt>
      <dd className="op-num mt-0.5 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Weather                                                             */
/* ------------------------------------------------------------------ */

export type WeatherWidgetProps = {
  data: WeatherResponse | null;
  loading?: boolean;
  error?: string | null;
  /** Human-readable name of the resolved location (e.g. the lot name). */
  locationName?: string;
  className?: string;
};

function locationLabel(weather: WeatherResponse): string {
  const from =
    weather.location.resolvedFrom === "lot"
      ? "Lote"
      : weather.location.resolvedFrom === "farm"
        ? "Campo"
        : "Coordenadas";
  return `${from} · ${weather.location.lat.toFixed(2)}, ${weather.location.lon.toFixed(2)}`;
}

/** Clima local: current temperature, precipitation and the 48 h series. */
export function WeatherWidget({
  data,
  loading,
  error,
  locationName,
  className = "",
}: WeatherWidgetProps) {
  const current = data?.current ?? null;
  return (
    <WidgetShell
      title="Clima local"
      source={data ? { stale: data.stale, fetchedAt: data.fetchedAt, label: "Open-Meteo" } : null}
      className={className}
    >
      {data && current ? (
        <>
          <div className="flex flex-wrap items-end gap-x-2">
            <p className="op-num font-display text-kpi leading-none text-ink">
              {num1.format(current.temperatureC)}
              <span className="align-top text-kpi">°</span>
            </p>
            <p className="op-label mb-1">C</p>
            <p className="op-caption mb-1.5 ml-auto text-right">
              {locationName ?? locationLabel(data)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <StatMini label="Precipitación" value={`${num1.format(current.precipitationMm)} mm`} />
            <StatMini label="Viento" value={`${num1.format(current.windSpeedKnots)} kn`} />
          </dl>

          <div>
            <p className="op-label mb-1">Precipitación · próximas 48 h</p>
            <AreaLine
              data={data.hourly.map((h) => h.precipitationMm)}
              color="var(--semantic-info)"
              height={44}
              className="h-11 w-full"
            />
          </div>

          {data.daily.length > 0 ? (
            <p className="op-caption">
              Pronóstico de {data.daily.length} días · máx.{" "}
              <span className="op-num">
                {num0.format(
                  Math.max(...data.daily.map((d) => d.precipitationProbabilityMax ?? 0)),
                )}
                %
              </span>{" "}
              de probabilidad
            </p>
          ) : null}
        </>
      ) : (
        <WidgetState loading={loading} error={error} />
      )}
    </WidgetShell>
  );
}

/** Viento: knot vector plus a wind rose built from the hourly forecast. */
export function WindWidget({ data, loading, error, className = "" }: WeatherWidgetProps) {
  const current = data?.current ?? null;
  return (
    <WidgetShell
      title="Viento"
      source={data ? { stale: data.stale, fetchedAt: data.fetchedAt, label: "Nudos" } : null}
      className={className}
    >
      {data && current ? (
        <>
          <div className="flex items-center gap-4">
            <WindRose values={windRoseValues(data.hourly)} size={104} />
            <div className="min-w-0">
              <p className="op-num font-display text-kpi leading-none text-ink">
                {num1.format(current.windSpeedKnots)}
                <span className="ml-1 text-sm font-semibold text-ink-soft">kn</span>
              </p>
              <p className="mt-1.5 text-sm text-ink-soft">
                del <span className="font-semibold text-ink">{compassPoint(current.windDirectionDeg)}</span>{" "}
                <span className="op-num">{Math.round(current.windDirectionDeg)}°</span>
              </p>
              <p className="op-caption mt-2">Rosa de los vientos · 48 h</p>
            </div>
          </div>
          <p className="text-xs text-ink-faint">
            Velocidad en nudos y dirección en grados, sin conversión en el cliente.
          </p>
        </>
      ) : (
        <WidgetState loading={loading} error={error} />
      )}
    </WidgetShell>
  );
}

export type RadarWidgetProps = WeatherWidgetProps & {
  /** The client-only Leaflet map, mounted by the page with next/dynamic. */
  map?: ReactNode;
};

/** Radar de lluvia: the interactive map slot plus the RainViewer metadata. */
export function RadarWidget({
  data,
  loading,
  error,
  map,
  className = "",
}: RadarWidgetProps) {
  const radar = data?.radar ?? null;
  const lastFrame = radar && radar.frames.length > 0 ? radar.frames[radar.frames.length - 1] : null;
  return (
    <WidgetShell
      title="Radar de lluvia"
      action={radar?.coverageWarning ? <Badge tone="wheat">Cobertura limitada</Badge> : null}
      source={data ? { stale: data.stale, fetchedAt: data.fetchedAt, label: "RainViewer" } : null}
      className={className}
    >
      {data ? (
        <>
          {map ? (
            <div className="overflow-hidden rounded-lg border border-agro-border">{map}</div>
          ) : null}

          {radar ? (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
                <span>
                  <span className="op-num font-semibold text-ink">{radar.frames.length}</span>{" "}
                  {radar.frames.length === 1 ? "cuadro" : "cuadros"}
                </span>
                {lastFrame ? (
                  <span>
                    Último: <span className="op-num">{fmtFetchedAt(lastFrame.time)}</span>
                  </span>
                ) : null}
              </div>
              {radar.coverageWarning ? (
                <p className="text-xs text-ink-soft">
                  La cobertura del radar es imperfecta sobre la zona. La precipitación de Open-Meteo
                  queda como información de reemplazo en Clima local.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink-soft">
              El radar no está disponible en este momento; la precipitación de Open-Meteo sigue
              accesible en Clima local.
            </p>
          )}
        </>
      ) : (
        <WidgetState loading={loading} error={error} />
      )}
    </WidgetShell>
  );
}

/* ------------------------------------------------------------------ */
/* Market data                                                         */
/* ------------------------------------------------------------------ */

export type UsdWidgetProps = {
  data: UsdRateResponse | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
};

/** Dólar oficial (Banco Nación): compra, venta and the source timestamp. */
export function UsdWidget({ data, loading, error, className = "" }: UsdWidgetProps) {
  return (
    <WidgetShell
      title={`Dólar oficial · ${data?.nombre ?? "BNA"}`}
      source={data ? { stale: data.stale, fetchedAt: data.fetchedAt, label: data.source } : null}
      className={className}
    >
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="op-label">Compra</p>
              <p className="op-num font-display text-title font-semibold text-ink">
                {arsFmt.format(data.compra)}
              </p>
            </div>
            <div>
              <p className="op-label">Venta</p>
              <p className="op-num font-display text-title font-semibold text-ink">
                {arsFmt.format(data.venta)}
              </p>
            </div>
          </div>
          <p className="op-caption">
            Cotización de la fuente: <span className="op-num">{fmtSourceDate(data.fechaActualizacion)}</span>
          </p>
        </>
      ) : (
        <WidgetState loading={loading} error={error} />
      )}
    </WidgetShell>
  );
}

export type GrainPricesWidgetProps = {
  data: GrainPricesResponse | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
};

/** Pizarra de cereales BCR: five grains in $/Tn and US$/Tn. */
export function GrainPricesWidget({
  data,
  loading,
  error,
  className = "",
}: GrainPricesWidgetProps) {
  return (
    <WidgetShell
      title="Pizarra de cereales"
      source={data ? { stale: data.stale, fetchedAt: data.fetchedAt, label: data.source } : null}
      className={className}
    >
      {data && data.prices.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="op-label">Grano</span>
            <span className="flex gap-6">
              <span className="op-label">$/Tn</span>
              <span className="op-label w-16 text-right">US$/Tn</span>
            </span>
          </div>
          <ul className="divide-y divide-agro-border">
            {data.prices.map((row) => (
              <li key={row.grain} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm font-medium text-ink">{row.label}</span>
                <span className="flex items-baseline gap-6">
                  <span className="op-num text-sm text-ink">
                    {row.pricePerTonArs === null ? "S/C" : arsFmt.format(row.pricePerTonArs)}
                  </span>
                  <span className="op-num w-16 text-right text-xs text-ink-soft">
                    {row.pricePerTonUsd === null ? "S/C" : `US$ ${num0.format(row.pricePerTonUsd)}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="op-caption">
            Pizarra del <span className="op-num">{fmtBoardDate(data.date)}</span>
            {data.bnaRate !== null
              ? ` · Dólar BCR ${num0.format(data.bnaRate)}`
              : " · sin cotización de conversión"}
          </p>
        </>
      ) : (
        <WidgetState
          loading={loading}
          error={error}
          empty="La pizarra no está disponible en este momento."
        />
      )}
    </WidgetShell>
  );
}
