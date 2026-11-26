"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/form";
import { Button, Card, CardHeader, EmptyState, TabButton } from "@/components/ui/primitives";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FinanceIcon } from "@/components/ui/icons";
import {
  ApiError,
  getLotProfitability,
  type LotProfitabilityListDTO,
  type ProfitabilityFilter,
  type ValuationMode,
} from "@/api/client";
import {
  campaignOptions,
  currentCampaign,
  describeRange,
  rangeFilter,
  validateCustomRange,
  type RangeSelection,
} from "./campaign";
import { LotDetailDrawer } from "./lot-detail-drawer";
import {
  USD_RATE_LABELS,
  describePendingBanner,
  formatArs,
  formatDecimal,
  formatMarginArs,
  formatProfitability,
  formatValuedAt,
} from "./format";
import {
  MODES,
  MODE_LABELS,
  calculatorErrorMessage,
  nextSort,
  sortRows,
  type SortColumn,
  type SortState,
} from "./metrics";

const CAMPAIGNS_SHOWN = 6;
const CUSTOM = "custom";

const COLUMNS: Array<{ column: SortColumn; label: string; numeric: boolean }> = [
  { column: "field", label: "Campo / lote", numeric: false },
  { column: "client", label: "Cliente", numeric: false },
  { column: "area", label: "Superficie", numeric: true },
  { column: "income", label: "Ingreso", numeric: true },
  { column: "cost", label: "Costo", numeric: true },
  { column: "margin", label: "Margen bruto", numeric: true },
  { column: "marginPerHa", label: "Margen / ha", numeric: true },
  { column: "profitability", label: "Rentabilidad", numeric: true },
];

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: LotProfitabilityListDTO };

/** Margin cells turn red when negative; a missing value stays neutral. */
function marginTone(value: string | null): string {
  return typeof value === "string" && value.startsWith("-") && !/^-0(\.0+)?$/.test(value)
    ? "text-danger"
    : "text-ink";
}

function SortHeader({
  column,
  label,
  numeric,
  sort,
  onSort,
}: {
  column: SortColumn;
  label: string;
  numeric: boolean;
  sort: SortState | null;
  onSort: (column: SortColumn) => void;
}) {
  const active = sort?.column === column;
  const arrow = active ? (sort.direction === "asc" ? "▲" : "▼") : "";
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className={`px-3 py-2 font-semibold ${numeric ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 font-semibold hover:text-ink"
      >
        {label}
        <span aria-hidden="true" className="w-3 text-[10px]">
          {arrow}
        </span>
      </button>
    </th>
  );
}

/**
 * Lot profitability calculator (ADMIN only; the backend enforces it with
 * `@Roles`). Income is accrued: it is the value of the approved daily reports,
 * not collections. Every figure comes from the API: the client only sorts and
 * formats it.
 */
export function CalculadoraTab() {
  const [now] = useState(() => new Date());
  const options = useMemo(() => campaignOptions(now, CAMPAIGNS_SHOWN), [now]);

  const [mode, setMode] = useState<ValuationMode>("AL_APROBAR");
  const [campaign, setCampaign] = useState<string>(() => currentCampaign(new Date()));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  // The range the table was last asked for: a campaign, or an applied custom range.
  const [selection, setSelection] = useState<RangeSelection>(() => ({
    kind: "campaign",
    campaign: currentCampaign(new Date()),
  }));

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [sort, setSort] = useState<SortState | null>(null);
  const [detailLot, setDetailLot] = useState<{ lotId: string; lotName: string } | null>(null);

  const filter: ProfitabilityFilter = useMemo(() => rangeFilter(selection), [selection]);
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setState({ status: "loading" });
    });

    getLotProfitability(JSON.parse(filterKey) as ProfitabilityFilter, mode)
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            status: "error",
            message: calculatorErrorMessage(err instanceof ApiError ? err.status : null, mode),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [filterKey, mode]);

  const data = state.status === "ready" ? state.data : null;
  const rows = useMemo(() => {
    if (!data) return [];
    return sort ? sortRows(data.lots, sort) : data.lots;
  }, [data, sort]);

  const isCustom = selection.kind === "range";
  const pendingText = data ? describePendingBanner(data.pending) : null;

  function chooseCampaign(value: string) {
    setCustomError(null);
    if (value === CUSTOM) {
      setCampaign(CUSTOM);
      return;
    }
    setCampaign(value);
    setSelection({ kind: "campaign", campaign: value });
  }

  function applyCustomRange() {
    const problem = validateCustomRange(customFrom, customTo);
    setCustomError(problem);
    if (problem) return;
    setSelection({ kind: "range", from: customFrom, to: customTo });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Rentabilidad por lote"
          subtitle="Ingreso devengado por los partes aprobados, menos el costo estándar y los gastos del lote."
        />

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              label="Campaña"
              value={isCustom || campaign === CUSTOM ? CUSTOM : campaign}
              options={[...options, { value: CUSTOM, label: "Rango personalizado" }]}
              onChange={(e) => chooseCampaign(e.target.value)}
              className="min-w-48"
            />
            {(campaign === CUSTOM || isCustom) && (
              <>
                <TextField
                  label="Desde"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
                <TextField
                  label="Hasta"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
                <Button variant="secondary" onClick={applyCustomRange}>
                  Aplicar
                </Button>
              </>
            )}

            <div className="ml-auto flex gap-1" role="tablist" aria-label="Valorización">
              {MODES.map((value) => (
                <TabButton key={value} active={mode === value} onClick={() => setMode(value)}>
                  {MODE_LABELS[value]}
                </TabButton>
              ))}
            </div>
          </div>

          {customError && <Alert tone="error">{customError}</Alert>}

          {data && (
            <p className="text-sm text-ink-soft">
              {describeRange(data.range)}.{" "}
              {data.mode === "A_VALOR_HOY"
                ? `Kilos y dólares a precios de hoy${
                    data.valuation.usdRateType
                      ? ` (dólar ${USD_RATE_LABELS[data.valuation.usdRateType]})`
                      : ""
                  }${data.valuation.priceDate ? `, cotizaciones del ${formatValuedAt(data.valuation.priceDate)}` : ""}. Los importes pactados en pesos no se ajustan.`
                : "Importes valorizados al aprobar cada parte o al cargar cada gasto."}
            </p>
          )}

          {pendingText && <Alert tone="warning">{pendingText}</Alert>}

          {state.status === "error" && <Alert tone="error">{state.message}</Alert>}

          {state.status === "loading" && <TableSkeleton rows={5} columns={COLUMNS.length} />}

          {data && data.lots.length === 0 && (
            <EmptyState
              icon={<FinanceIcon />}
              title="Sin actividad en este rango"
              subtitle="Ningún lote de la firma tiene partes valorizados, partes sin valorizar ni gastos entre estas fechas."
            />
          )}

          {data && data.lots.length > 0 && (
            <div className="max-h-[32rem] overflow-auto rounded-lg border border-agro-border">
              <table className="text-numeric w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-base-subtle text-xs text-ink-soft">
                  <tr>
                    {COLUMNS.map((column) => (
                      <SortHeader
                        key={column.column}
                        column={column.column}
                        label={column.label}
                        numeric={column.numeric}
                        sort={sort}
                        onSort={(value) => setSort((current) => nextSort(current, value))}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-agro-border">
                  {rows.map((row) => (
                    <tr
                      key={row.lotId}
                      className="cursor-pointer hover:bg-base-subtle/60"
                      onClick={() => setDetailLot({ lotId: row.lotId, lotName: row.lotName })}
                    >
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          className="text-left font-medium text-ink underline-offset-2 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailLot({ lotId: row.lotId, lotName: row.lotName });
                          }}
                        >
                          {row.lotName}
                        </button>
                        <span className="block text-xs text-ink-soft">{row.farmName}</span>
                      </td>
                      <td className="px-3 py-2.5">{row.clientName}</td>
                      <td className="px-3 py-2.5 text-right">{formatDecimal(row.areaHa, 0, 2)} ha</td>
                      <td className="px-3 py-2.5 text-right">{formatArs(row.incomeArs)}</td>
                      <td className="px-3 py-2.5 text-right">{formatArs(row.costArs)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${marginTone(row.marginArs)}`}>
                        {formatMarginArs(row.marginArs)}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${marginTone(row.marginPerHaArs)}`}>
                        {formatMarginArs(row.marginPerHaArs)}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${marginTone(row.profitability)}`}>
                        {formatProfitability(row.profitability)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 z-10 border-t-2 border-agro-border-strong bg-card font-semibold text-ink">
                  <tr>
                    <td className="px-3 py-2.5" colSpan={2}>
                      Total de la firma
                    </td>
                    <td className="px-3 py-2.5 text-right">{formatDecimal(data.totals.areaHa, 0, 2)} ha</td>
                    <td className="px-3 py-2.5 text-right">{formatArs(data.totals.incomeArs)}</td>
                    <td className="px-3 py-2.5 text-right">{formatArs(data.totals.costArs)}</td>
                    <td className={`px-3 py-2.5 text-right ${marginTone(data.totals.marginArs)}`}>
                      {formatMarginArs(data.totals.marginArs)}
                    </td>
                    <td className={`px-3 py-2.5 text-right ${marginTone(data.totals.marginPerHaArs)}`}>
                      {formatMarginArs(data.totals.marginPerHaArs)}
                    </td>
                    <td className={`px-3 py-2.5 text-right ${marginTone(data.totals.profitability)}`}>
                      {formatProfitability(data.totals.profitability)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </Card>

      <LotDetailDrawer lot={detailLot} filter={filter} mode={mode} onClose={() => setDetailLot(null)} />
    </div>
  );
}
