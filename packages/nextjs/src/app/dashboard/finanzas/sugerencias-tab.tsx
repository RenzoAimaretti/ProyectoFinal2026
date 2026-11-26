"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, useToast } from "@/components/ui/feedback";
import { SelectField, TextareaField } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, Button, Card, CardHeader, EmptyState, Modal, type Tone } from "@/components/ui/primitives";
import { Table, Td, Th } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FinanceIcon } from "@/components/ui/icons";
import {
  approveExpenseSuggestion,
  getExpenseCategories,
  getExpenseSuggestions,
  listFarms,
  listLots,
  rejectExpenseSuggestion,
  type ExpenseCategoryDTO,
  type ExpenseSuggestionDTO,
  type ExpenseSuggestionStatus,
  type FarmDTO,
  type LotDTO,
} from "@/api/client";
import { canResolveSuggestions } from "./access";
import { describeFinanceError, isConflict } from "./finance-errors";
import {
  SUGGESTION_KIND_LABELS,
  SUGGESTION_STATUS_LABELS,
  describeProposedChanges,
  formatDay,
  formatMoney,
  formatValuedAt,
} from "./format";

const STATUS_TONE: Record<ExpenseSuggestionStatus, Tone> = {
  PENDIENTE: "wheat",
  APROBADA: "green",
  RECHAZADA: "earth",
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  ...(Object.keys(SUGGESTION_STATUS_LABELS) as ExpenseSuggestionStatus[]).map((value) => ({
    value,
    label: SUGGESTION_STATUS_LABELS[value],
  })),
];

export function SugerenciasTab({ role }: { role: string | null | undefined }) {
  const { success, error: toastError } = useToast();
  const canResolve = canResolveSuggestions(role);

  const [suggestions, setSuggestions] = useState<ExpenseSuggestionDTO[]>([]);
  const [lots, setLots] = useState<LotDTO[]>([]);
  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The ADMIN works the inbox: pending first. The SUPERVISOR follows all of theirs.
  const [status, setStatus] = useState<"" | ExpenseSuggestionStatus>(canResolve ? "PENDIENTE" : "");

  const [approving, setApproving] = useState<ExpenseSuggestionDTO | null>(null);
  const [approveBusy, setApproveBusy] = useState(false);

  const [rejecting, setRejecting] = useState<ExpenseSuggestionDTO | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  const lotNames = useMemo(() => {
    const farmNames = new Map(farms.map((farm) => [farm.id, farm.name]));
    return new Map(lots.map((lot) => [lot.id, `${farmNames.get(lot.farmId) ?? "Campo"} · ${lot.name}`]));
  }, [lots, farms]);
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const names = {
    lot: (id: string) => lotNames.get(id) ?? "Lote",
    category: (id: string) => categoryNames.get(id) ?? "Categoría",
  };

  const load = useCallback(async (selected: "" | ExpenseSuggestionStatus) => {
    setLoadError(null);
    try {
      const [rows, lotRows, farmRows, categoryRows] = await Promise.all([
        getExpenseSuggestions(selected === "" ? undefined : selected),
        listLots(),
        listFarms(),
        getExpenseCategories(),
      ]);
      setSuggestions(rows);
      setLots(lotRows);
      setFarms(farmRows);
      setCategories(categoryRows);
    } catch (err) {
      setLoadError(describeFinanceError(err, "No se pudieron cargar las sugerencias"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load(status);
    });
    return () => {
      active = false;
    };
  }, [status, load]);

  const confirmApprove = async () => {
    if (!approving) return;
    setApproveBusy(true);
    try {
      await approveExpenseSuggestion(approving.id);
      success("Sugerencia aprobada y aplicada al gasto.", "Sugerencias");
      setApproving(null);
      await load(status);
    } catch (err) {
      toastError(describeFinanceError(err, "No se pudo aprobar la sugerencia"), "Sugerencias");
      setApproving(null);
      // A resolved or changed suggestion is stale on screen: refresh it.
      if (isConflict(err)) await load(status);
    } finally {
      setApproveBusy(false);
    }
  };

  const openReject = (suggestion: ExpenseSuggestionDTO) => {
    setRejecting(suggestion);
    setReason("");
    setReasonError(null);
  };

  const submitReject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rejecting) return;
    if (reason.trim() === "") {
      setReasonError("Indicá el motivo del rechazo.");
      return;
    }
    setRejectBusy(true);
    try {
      await rejectExpenseSuggestion(rejecting.id, reason.trim());
      success("Sugerencia rechazada.", "Sugerencias");
      setRejecting(null);
      await load(status);
    } catch (err) {
      setReasonError(describeFinanceError(err, "No se pudo rechazar la sugerencia"));
      if (isConflict(err)) await load(status);
    } finally {
      setRejectBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert tone="info" title="Sugerencias de edición y baja">
        {canResolve
          ? "Al aprobar una edición se aplican los valores propuestos y el gasto se revalúa solo si cambian el monto, la moneda o el grano. Una sugerencia resuelta es final."
          : "Acá ves el estado de tus sugerencias y, si fueron rechazadas, el motivo. El gasto conserva su valor actual hasta que el administrador apruebe el cambio."}
      </Alert>

      {loadError && (
        <Alert tone="error" title="No se pudieron cargar las sugerencias">
          {loadError}
        </Alert>
      )}

      <Card>
        <CardHeader
          title={canResolve ? "Bandeja de sugerencias" : "Mis sugerencias"}
          action={
            <div className="w-48">
              <SelectField
                label="Estado"
                value={status}
                options={STATUS_OPTIONS}
                onChange={(e) => {
                  setLoading(true);
                  setStatus(e.target.value as "" | ExpenseSuggestionStatus);
                }}
              />
            </div>
          }
        />
        <div className="p-4">
          {loading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : suggestions.length === 0 ? (
            <EmptyState
              icon={<FinanceIcon />}
              title="Sin sugerencias"
              subtitle={
                canResolve
                  ? "No hay sugerencias para el estado elegido."
                  : "Todavía no enviaste sugerencias para el estado elegido."
              }
            />
          ) : (
            <Table>
              <thead className="bg-base-subtle text-xs text-ink-soft">
                <tr>
                  <Th>Enviada</Th>
                  <Th>Gasto</Th>
                  <Th>Tipo</Th>
                  <Th>Cambios propuestos</Th>
                  <Th>Estado</Th>
                  {canResolve && <Th align="right">Acciones</Th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-agro-border">
                {suggestions.map((suggestion) => {
                  const { expense } = suggestion;
                  return (
                    <tr key={suggestion.id}>
                      <Td>{formatValuedAt(suggestion.createdAt)}</Td>
                      <Td>
                        <div className="font-medium text-ink">{expense.description}</div>
                        <div className="text-xs text-ink-soft">
                          {names.lot(expense.lotId)} · {formatDay(expense.date)} ·{" "}
                          {formatMoney(expense.amount, expense.unit, expense.grain)}
                        </div>
                        {expense.deleted && (
                          <div className="mt-1">
                            <Badge tone="slate">Dado de baja</Badge>
                          </div>
                        )}
                      </Td>
                      <Td>{SUGGESTION_KIND_LABELS[suggestion.kind]}</Td>
                      <Td>
                        <ul className="space-y-0.5 text-sm">
                          {describeProposedChanges(suggestion, names).map((row) => (
                            <li key={row.label}>
                              <span className="text-ink-soft">{row.label}: </span>
                              {row.value}
                            </li>
                          ))}
                        </ul>
                      </Td>
                      <Td>
                        <Badge tone={STATUS_TONE[suggestion.status]}>
                          {SUGGESTION_STATUS_LABELS[suggestion.status]}
                        </Badge>
                        {suggestion.status === "RECHAZADA" && suggestion.rejectionReason && (
                          <p className="mt-1 text-xs text-ink-soft">Motivo: {suggestion.rejectionReason}</p>
                        )}
                      </Td>
                      {canResolve && (
                        <Td align="right">
                          {suggestion.status === "PENDIENTE" && (
                            <div className="flex justify-end gap-2">
                              <Button onClick={() => setApproving(suggestion)}>Aprobar</Button>
                              <Button variant="secondary" onClick={() => openReject(suggestion)}>
                                Rechazar
                              </Button>
                            </div>
                          )}
                        </Td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={approving !== null}
        onClose={() => setApproving(null)}
        onConfirm={() => void confirmApprove()}
        title="Aprobar sugerencia"
        message={
          approving?.kind === "BAJA"
            ? "El gasto se da de baja: deja de contarse en los listados y en la calculadora. La sugerencia queda aprobada."
            : "Se aplican los valores propuestos al gasto. Si cambian el monto, la moneda o el grano, se revalúa con los precios de hoy."
        }
        confirmLabel="Aprobar"
        tone="primary"
        loading={approveBusy}
      />

      <Modal
        open={rejecting !== null}
        onClose={() => !rejectBusy && setRejecting(null)}
        title="Rechazar sugerencia"
        subtitle="El motivo es obligatorio y lo ve quien la envió."
        widthClass="max-w-md"
      >
        <form className="space-y-4" onSubmit={submitReject}>
          <TextareaField
            label="Motivo del rechazo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={reasonError ?? undefined}
            disabled={rejectBusy}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejecting(null)} disabled={rejectBusy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={rejectBusy}>
              {rejectBusy ? "Rechazando…" : "Rechazar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
