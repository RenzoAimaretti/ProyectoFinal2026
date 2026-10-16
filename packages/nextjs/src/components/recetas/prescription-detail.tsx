"use client";

import type { RecipeDetailDTO } from "@/api/client";
import { DOSAGE_BASIS_LABELS } from "@/api/client";
import {
  formatDate,
  formatNumber,
} from "./prescription-calc";

/**
 * Read-only rendering of a prescription. It shows the server-computed totals
 * (`caldoTotal` and each item `total`) exactly as returned by
 * `GET /recipes/:id`, and is honest when the lot area was unknown so no totals
 * could be computed.
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
    <div className="space-y-5">
      <div>
        <p className="op-label">Actividad</p>
        <p className="mt-1 text-sm font-semibold text-ink">{taskTypeName}</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {farmName} <span className="text-ink-faint">·</span> {lotName}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <DetailRow label="Fecha" value={formatDate(recipe.date) || "—"} />
        <DetailRow
          label="Estado"
          value={recipe.status === "ARCHIVADA" ? "Archivada" : "Activa"}
        />
        <DetailRow label="Plaga objetivo" value={recipe.pest || "No indicada"} />
        <DetailRow label="Cultivo" value={recipe.crop || "No indicado"} />
        <DetailRow
          label="Volumen de caldo (por ha)"
          value={`${formatNumber(recipe.sprayVolume)} ${recipe.sprayVolumeUnit}`}
        />
        <DetailRow
          label="Superficie del lote"
          value={
            typeof recipe.lotArea === "number"
              ? `${formatNumber(recipe.lotArea)} ha`
              : "Sin superficie registrada"
          }
        />
      </dl>

      <div className="op-plate px-4 py-3">
        <p className="op-label">Caldo total del lote</p>
        {hasCaldo ? (
          <p className="op-num mt-1 text-2xl font-bold text-ink">
            {formatNumber(recipe.caldoTotal)}{" "}
            <span className="text-base font-semibold text-ink-soft">L</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">
            No se pudo calcular: el lote no tiene una superficie registrada.
          </p>
        )}
      </div>

      <div className="overflow-hidden border border-agro-border">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Productos de la receta con dosis y total a cargar
          </caption>
          <thead className="bg-base-subtle/60">
            <tr className="text-left">
              <th scope="col" className="op-label px-3 py-2">Orden</th>
              <th scope="col" className="op-label px-3 py-2">Producto</th>
              <th scope="col" className="op-label px-3 py-2">Dosis</th>
              <th scope="col" className="op-label px-3 py-2">Base</th>
              <th scope="col" className="op-label px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {recipe.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-ink-soft">
                  La receta no tiene productos.
                </td>
              </tr>
            ) : (
              recipe.items.map((item) => (
                <tr key={item.id} className="border-t border-agro-border">
                  <td className="op-num px-3 py-2 text-ink-soft">{item.loadOrder}</td>
                  <td className="px-3 py-2 font-medium text-ink">
                    {item.inputName ?? "Insumo"}
                  </td>
                  <td className="op-num px-3 py-2 text-ink">
                    {formatNumber(item.dose)}
                    {item.unit ? ` ${item.unit}` : ""}
                  </td>
                  <td className="px-3 py-2 text-ink-soft">
                    {DOSAGE_BASIS_LABELS[item.dosageBasis]}
                  </td>
                  <td className="op-num px-3 py-2 text-right font-semibold text-ink">
                    {typeof item.total === "number"
                      ? `${formatNumber(item.total)}${item.unit ? ` ${item.unit}` : ""}`
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div>
        <p className="op-label">Plan de reaplicación</p>
        <p className="mt-1 text-sm text-ink-soft">
          {reapplyParts.length > 0
            ? `Reaplicar ${reapplyParts.join(" ")}.`
            : "Sin plan de reaplicación registrado."}
        </p>
      </div>

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
