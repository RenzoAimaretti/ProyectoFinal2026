"use client";

import type { RecipeDetailDTO } from "@/api/client";
import { DOSAGE_BASIS_LABELS } from "@/api/client";
import {
  baseDosageUnit,
  formatDate,
  formatNumber,
  formatWithUnit,
  normalizeDosageUnit,
} from "./prescription-calc";

/**
 * Read-only rendering of a prescription. It reads in the classic prescription
 * order — the lot and its surface, then the caldo (per hectare and total litres),
 * then each product with its rate, basis, total amount, equivalence per hectare
 * and per 100 L, and its load order — and finishes with the re-application plan
 * and the observations. Every amount comes from the server-computed totals, so
 * the document agrees exactly with the saved recipe; anything the server could
 * not compute is shown as an honest "—".
 */
export function PrescriptionDetail({
  recipe,
  taskTypeName,
  farmName,
  lotName,
}: {
  recipe: RecipeDetailDTO;
  taskTypeName: string;
  farmName: string;
  lotName: string;
}) {
  const hasArea =
    typeof recipe.lotArea === "number" && Number.isFinite(recipe.lotArea);
  const hasCaldo =
    typeof recipe.caldoTotal === "number" && Number.isFinite(recipe.caldoTotal);

  const reapplyParts: string[] = [];
  if (recipe.reapplicationIntervalDays !== null) {
    reapplyParts.push(`cada ${recipe.reapplicationIntervalDays} día(s)`);
  }
  if (recipe.reapplicationDate) {
    reapplyParts.push(`el ${formatDate(recipe.reapplicationDate)}`);
  }

  return (
    <div className="space-y-6">
      {/* Actividad prescripta */}
      <div>
        <p className="op-label">Actividad</p>
        <p className="mt-1 text-sm font-semibold text-ink">{taskTypeName}</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {farmName} <span className="text-ink-faint">·</span> {lotName}
        </p>
      </div>

      {/* Encabezado de la receta */}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <DetailRow label="Fecha" value={formatDate(recipe.date) || "—"} />
        <DetailRow
          label="Estado"
          value={recipe.status === "ARCHIVADA" ? "Archivada" : "Activa"}
        />
        <DetailRow label="Plaga objetivo" value={recipe.pest || "No indicada"} />
        <DetailRow label="Cultivo" value={recipe.crop || "No indicado"} />
        <DetailRow label="Lote" value={lotName} />
        <DetailRow
          label="Superficie del lote"
          value={
            hasArea
              ? `${formatNumber(recipe.lotArea)} ha`
              : "Sin superficie registrada"
          }
        />
      </dl>

      {/* Caldo: por hectárea y total del lote */}
      <div className="op-plate px-4 py-3">
        <p className="op-label">Caldo</p>
        <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <p className="op-caption">Por hectárea</p>
            <p className="op-num mt-0.5 text-lg font-semibold text-ink">
              {formatNumber(recipe.sprayVolume)}{" "}
              <span className="text-sm font-semibold text-ink-soft">
                {recipe.sprayVolumeUnit}
              </span>
            </p>
          </div>
          <div>
            <p className="op-caption">Total del lote</p>
            {hasCaldo ? (
              <p className="op-num mt-0.5 text-2xl font-bold text-ink">
                {formatNumber(recipe.caldoTotal)}{" "}
                <span className="text-base font-semibold text-ink-soft">L</span>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-ink-soft">
                No se pudo calcular: el lote no tiene una superficie registrada.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Productos, en orden de carga */}
      <div>
        <p className="op-label">Productos (orden de carga)</p>
        {recipe.items.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-agro-border px-3 py-4 text-center text-sm text-ink-soft">
            La receta no tiene productos.
          </p>
        ) : (
          <ol className="mt-2 divide-y divide-agro-border border border-agro-border">
            {recipe.items.map((item) => {
              const baseUnit = baseDosageUnit(item.unit);
              const rateUnit = normalizeDosageUnit(item.unit, item.dosageBasis);
              const perHectareUnit = baseUnit ? `${baseUnit}/ha` : null;
              const per100LUnit = baseUnit ? `${baseUnit}/100 L` : null;
              return (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="op-caption">
                        Orden{" "}
                        <span className="op-num font-semibold text-ink">
                          {item.loadOrder}
                        </span>{" "}
                        · {DOSAGE_BASIS_LABELS[item.dosageBasis]}
                      </p>
                      <p className="truncate text-sm font-semibold text-ink">
                        {item.inputName ?? "Insumo"}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        Dosis:{" "}
                        <span className="op-num text-ink">
                          {formatWithUnit(item.dose, rateUnit)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="op-label">Total a cargar</p>
                      <p className="op-num text-lg font-bold text-ink">
                        {formatWithUnit(item.total ?? null, baseUnit)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 border-t border-agro-border pt-2">
                    <p className="op-caption">
                      Por hectárea:{" "}
                      <span className="op-num text-ink">
                        {formatWithUnit(item.perHectare ?? null, perHectareUnit)}
                      </span>
                    </p>
                    <p className="op-caption">
                      Por 100 L:{" "}
                      <span className="op-num text-ink">
                        {formatWithUnit(item.per100L ?? null, per100LUnit)}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {!hasArea && recipe.items.length > 0 && (
          <p className="mt-2 text-xs text-ink-soft">
            Los totales no están calculados porque el lote no tiene una superficie
            registrada.
          </p>
        )}
      </div>

      {/* Plan de reaplicación */}
      <div>
        <p className="op-label">Plan de reaplicación</p>
        <p className="mt-1 text-sm text-ink-soft">
          {reapplyParts.length > 0
            ? `Reaplicar ${reapplyParts.join(" ")}.`
            : "Sin plan de reaplicación registrado."}
        </p>
      </div>

      {/* Observaciones */}
      <div>
        <p className="op-label">Observaciones</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
          {recipe.observations || "Sin observaciones."}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="op-label">{label}</dt>
      <dd className="op-num mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}
