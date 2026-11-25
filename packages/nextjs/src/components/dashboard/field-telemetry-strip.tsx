"use client";

import type {
  GrainPricesResponse,
  UsdRateResponse,
  WeatherResponse,
} from "@/api/client";
import type { WeatherLotOption } from "@/components/weather/weather-widgets";

const num1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const num0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const arsFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

function compassPoint(deg: number): (typeof COMPASS)[number] {
  const norm = ((deg % 360) + 360) % 360;
  return COMPASS[Math.round(norm / 45) % 8];
}

export function FieldTelemetryStrip({
  weather,
  weatherLoading,
  weatherError,
  lots,
  selectedLotId,
  onLotChange,
  usdRate,
  grainPrices,
  marketLoading,
}: {
  weather: WeatherResponse | null;
  weatherLoading: boolean;
  weatherError: string | null;
  lots: WeatherLotOption[];
  selectedLotId: string | null;
  onLotChange: (lotId: string) => void;
  usdRate: UsdRateResponse | null;
  grainPrices: GrainPricesResponse | null;
  marketLoading: boolean;
}) {
  const topGrains = (grainPrices?.prices ?? [])
    .filter((row) => row.pricePerTonUsd !== null || row.pricePerTonArs !== null)
    .slice(0, 3);

  const selectedLotName =
    lots.find((l) => l.id === selectedLotId)?.name ?? null;

  return (
    <section
      aria-label="Condiciones climáticas y cotizaciones"
      className="op-plate mb-5 grid grid-cols-1 divide-y divide-agro-border lg:grid-cols-3 lg:divide-x lg:divide-y-0"
    >
      {/* 1. Clima & Viento */}
      <div className="flex flex-col justify-between gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="op-label">Clima y viento</span>
            {weather?.stale && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
                Desactualizado
              </span>
            )}
          </div>
          {lots.length > 1 && selectedLotId ? (
            <select
              aria-label="Lote para telemetría climática"
              value={selectedLotId}
              onChange={(e) => onLotChange(e.target.value)}
              className="max-w-[9.5rem] truncate rounded border border-agro-border bg-card px-1.5 py-0.5 text-xs text-ink"
            >
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name}
                </option>
              ))}
            </select>
          ) : selectedLotName ? (
            <span className="op-caption truncate">{selectedLotName}</span>
          ) : null}
        </div>

        {weatherLoading && !weather ? (
          <div className="skeleton h-6 w-48" aria-hidden="true" />
        ) : weather ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="op-num text-lg font-bold text-ink">
              {num1.format(weather.current.temperatureC)}°C
            </span>
            <span className="text-ink-soft">
              Viento{" "}
              <strong className="op-num text-ink">
                {num1.format(weather.current.windSpeedKnots)} kn
              </strong>{" "}
              {compassPoint(weather.current.windDirectionDeg)}
            </span>
            <span className="text-ink-soft">
              Lluvia{" "}
              <strong className="op-num text-ink">
                {num1.format(weather.current.precipitationMm)} mm
              </strong>
            </span>
          </div>
        ) : (
          <p className="text-xs text-ink-soft">
            {weatherError ?? "Sin datos climáticos."}
          </p>
        )}
      </div>

      {/* 2. Dólar Oficial */}
      <div className="flex flex-col justify-between gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="op-label">
            Dólar oficial · {usdRate?.nombre ?? "BNA"}
          </span>
          {usdRate?.stale && (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
              Desactualizado
            </span>
          )}
        </div>

        {marketLoading && !usdRate ? (
          <div className="skeleton h-6 w-40" aria-hidden="true" />
        ) : usdRate ? (
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
            <span className="text-ink-soft">
              Compra{" "}
              <strong className="op-num text-base font-bold text-ink">
                {arsFmt.format(usdRate.compra)}
              </strong>
            </span>
            <span className="text-ink-soft">
              Venta{" "}
              <strong className="op-num text-base font-bold text-ink">
                {arsFmt.format(usdRate.venta)}
              </strong>
            </span>
          </div>
        ) : (
          <p className="text-xs text-ink-soft">
            Cotización no disponible en este momento.
          </p>
        )}
      </div>

      {/* 3. Pizarra BCR + enlace al radar */}
      <div className="flex flex-col justify-between gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="op-label">Pizarra BCR</span>
            {grainPrices?.stale && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
                Desactualizado
              </span>
            )}
          </div>
          <a
            href="#condiciones-campo"
            className="text-xs font-semibold text-agro-green-text hover:underline"
          >
            Radar y pizarra ↓
          </a>
        </div>

        {marketLoading && !grainPrices ? (
          <div className="skeleton h-6 w-52" aria-hidden="true" />
        ) : topGrains.length > 0 ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
            {topGrains.map((row) => (
              <span key={row.grain} className="text-ink-soft">
                <span className="font-medium text-ink">{row.label}</span>{" "}
                <span className="op-num font-semibold text-ink">
                  {row.pricePerTonUsd !== null
                    ? `US$ ${num0.format(row.pricePerTonUsd)}`
                    : arsFmt.format(row.pricePerTonArs!)}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-soft">
            Pizarra no disponible en este momento.
          </p>
        )}
      </div>
    </section>
  );
}
