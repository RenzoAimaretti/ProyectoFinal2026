"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import { Badge, Drawer } from "@/components/ui/primitives";
import { Table, Td, Th } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  ApiError,
  getLotProfitabilityDetail,
  type LotProfitabilityDetailDTO,
  type ProfitabilityFilter,
  type ValuationMode,
} from "@/api/client";
import {
  describePendingBanner,
  describeValuation,
  formatArs,
  formatDay,
  formatDecimal,
  formatMarginArs,
  formatMoney,
  formatProfitability,
  formatTariffComponent,
} from "./format";
import { MODE_LABELS, calculatorErrorMessage } from "./metrics";

type Props = {
  /** `null` keeps the drawer closed. */
  lot: { lotId: string; lotName: string } | null;
  filter: ProfitabilityFilter;
  mode: ValuationMode;
  onClose: () => void;
};

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; detail: LotProfitabilityDetailDTO };

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  );
}

/** Original valuation of a report or expense: warnings as badges, then the valuation date. */
function ValuationNotes({ flags }: { flags: Parameters<typeof describeValuation>[0] }) {
  const labels = describeValuation(flags);
  const warnings = labels.slice(0, -1);
  const valued = labels[labels.length - 1];
  return (
    <span className="mt-1 block space-y-1">
      {warnings.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {warnings.map((label) => (
            <Badge key={label} tone="wheat">
              {label}
            </Badge>
          ))}
        </span>
      )}
      <span className="block text-xs text-ink-faint">{valued}</span>
    </span>
  );
}

/**
 * Detail of one lot for the same range and mode as the table: valued reports,
 * expenses by category and the reports that still have no value.
 */
export function LotDetailDrawer({ lot, filter, mode, onClose }: Props) {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    if (!lot) return;
    let active = true;
    const lotId = lot.lotId;
    queueMicrotask(() => {
      if (active) setState({ status: "loading" });
    });

    getLotProfitabilityDetail(lotId, JSON.parse(filterKey) as ProfitabilityFilter, mode)
      .then((detail) => {
        if (active) setState({ status: "ready", detail });
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
  }, [lot, filterKey, mode]);

  const detail = state.status === "ready" ? state.detail : null;
  const pendingText = detail ? describePendingBanner(detail.pending) : null;

  return (
    <Drawer
      open={lot !== null}
      onClose={onClose}
      title={lot ? lot.lotName : "Detalle del lote"}
      subtitle={
        detail
          ? `${detail.lot.farmName} · ${detail.lot.clientName} · Valores ${MODE_LABELS[detail.mode].toLowerCase()}`
          : undefined
      }
      widthClass="max-w-3xl"
    >
      <div className="space-y-6 p-5">
        {state.status === "loading" && <TableSkeleton rows={4} columns={5} />}

        {state.status === "error" && <Alert tone="error">{state.message}</Alert>}

        {detail && (
          <>
            <dl className="grid grid-cols-2 gap-4 rounded-lg border border-agro-border p-4 sm:grid-cols-3">
              <SummaryItem label="Superficie" value={`${formatDecimal(detail.lot.areaHa, 0, 2)} ha`} />
              <SummaryItem label="Ingreso" value={formatArs(detail.summary.incomeArs)} />
              <SummaryItem label="Costo total" value={formatArs(detail.summary.costArs)} />
              <SummaryItem label="Margen bruto" value={formatMarginArs(detail.summary.marginArs)} />
              <SummaryItem label="Margen por ha" value={formatMarginArs(detail.summary.marginPerHaArs)} />
              <SummaryItem label="Rentabilidad" value={formatProfitability(detail.summary.profitability)} />
            </dl>

            {pendingText && <Alert tone="warning">{pendingText}</Alert>}

            {detail.mode === "A_VALOR_HOY" && (
              <p className="text-xs text-ink-soft">
                Los importes están a valor de hoy. Las marcas de precio desactualizado, valorización tardía y
                fecha de valorización describen la valorización original, al aprobar el parte o cargar el gasto.
              </p>
            )}

            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink">Partes valorizados</h4>
              {detail.reports.length === 0 ? (
                <p className="text-sm text-ink-soft">No hay partes valorizados en este rango.</p>
              ) : (
                <Table>
                  <thead className="bg-base-subtle text-xs text-ink-soft">
                    <tr>
                      <Th>Labor</Th>
                      <Th>Fecha</Th>
                      <Th align="right">Cantidad</Th>
                      <Th>Tarifa aplicada</Th>
                      <Th align="right">Ingreso</Th>
                      <Th align="right">Costo estándar</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-agro-border">
                    {detail.reports.map((report) => (
                      <tr key={report.reportId}>
                        <Td className="font-medium text-ink">
                          {report.laborName}
                          <ValuationNotes flags={report} />
                        </Td>
                        <Td>{formatDay(report.date)}</Td>
                        <Td align="right">
                          {formatDecimal(report.quantity, 0, 2)}{" "}
                          {report.price.basis === "POR_HECTAREA" ? "ha" : "h"}
                        </Td>
                        <Td>
                          <span className="block">Precio: {formatTariffComponent(report.price)}</span>
                          <span className="block text-ink-soft">Costo: {formatTariffComponent(report.cost)}</span>
                        </Td>
                        <Td align="right">{formatArs(report.incomeArs)}</Td>
                        <Td align="right">{formatArs(report.standardCostArs)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink">Gastos por categoría</h4>
              {detail.expensesByCategory.length === 0 ? (
                <p className="text-sm text-ink-soft">No hay gastos cargados en este rango.</p>
              ) : (
                <div className="space-y-4">
                  {detail.expensesByCategory.map((group) => (
                    <div key={group.categoryId}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <Badge tone="earth">{group.categoryName}</Badge>
                        <span className="text-sm font-semibold text-ink">
                          Subtotal {formatArs(group.subtotalArs)}
                        </span>
                      </div>
                      <Table>
                        <tbody className="divide-y divide-agro-border">
                          {group.expenses.map((expense) => (
                            <tr key={expense.expenseId}>
                              <Td>{formatDay(expense.date)}</Td>
                              <Td className="text-ink">
                                {expense.description}
                                <ValuationNotes flags={expense} />
                              </Td>
                              <Td align="right" className="text-ink-soft">
                                {formatMoney(expense.amount, expense.unit, expense.grain)}
                              </Td>
                              <Td align="right">{formatArs(expense.amountArs)}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Drawer>
  );
}
