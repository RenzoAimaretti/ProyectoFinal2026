"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, useToast } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, Button, Card, CardHeader, EmptyState, Modal } from "@/components/ui/primitives";
import { Table, Td, Th } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FinanceIcon } from "@/components/ui/icons";
import {
  createExpense,
  createExpenseSuggestion,
  deleteExpense,
  getExpenseCategories,
  getExpenses,
  listFarms,
  listLots,
  previewExpense,
  updateExpense,
  type ExpenseCategoryDTO,
  type ExpenseChangesInput,
  type ExpenseDTO,
  type ExpenseFilters,
  type ExpenseInput,
  type FarmDTO,
  type LotDTO,
} from "@/api/client";
import { expenseActions } from "./access";
import {
  emptyExpenseForm,
  expenseChanges,
  expenseToForm,
  previewPayload,
  todayLocal,
  validateExpenseForm,
  type ExpenseFormErrors,
  type ExpenseFormState,
} from "./expense-form";
import { describeFinanceError } from "./finance-errors";
import {
  GRAINS,
  GRAIN_LABELS,
  UNIT_LABELS,
  buildExpenseConfirmation,
  formatDay,
  formatMoney,
  formatArs,
  formatValuedAt,
  type ExpenseConfirmation,
} from "./format";

const UNIT_OPTIONS = (Object.keys(UNIT_LABELS) as Array<keyof typeof UNIT_LABELS>).map((value) => ({
  value,
  label: UNIT_LABELS[value],
}));
const GRAIN_OPTIONS = GRAINS.map((value) => ({ value, label: GRAIN_LABELS[value] }));

/** What the form is doing: a new expense, a direct edit (ADMIN) or a suggested edit (SUPERVISOR). */
type Editor =
  | { kind: "create" }
  | { kind: "edit"; expense: ExpenseDTO }
  | { kind: "suggest"; expense: ExpenseDTO };

type Pending = { input: ExpenseInput; changes: ExpenseChangesInput | null };

const EMPTY_FILTERS = { lotId: "", categoryId: "", from: "", to: "" };

export function GastosTab({ role }: { role: string | null | undefined }) {
  const { success, error: toastError } = useToast();
  const isAdmin = role === "ADMIN";

  const [lots, setLots] = useState<LotDTO[]>([]);
  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryDTO[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(emptyExpenseForm(todayLocal()));
  const [formErrors, setFormErrors] = useState<ExpenseFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Second step of the form: the summary the user confirms before anything is stored.
  const [confirmation, setConfirmation] = useState<ExpenseConfirmation | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const [removing, setRemoving] = useState<ExpenseDTO | null>(null);
  const [suggestingRemoval, setSuggestingRemoval] = useState<ExpenseDTO | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const lotNames = useMemo(() => {
    const farmNames = new Map(farms.map((farm) => [farm.id, farm.name]));
    return new Map(
      lots.map((lot) => [lot.id, `${farmNames.get(lot.farmId) ?? "Campo"} · ${lot.name}`]),
    );
  }, [lots, farms]);
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const lotName = (id: string) => lotNames.get(id) ?? "Lote";
  const categoryName = (id: string) => categoryNames.get(id) ?? "Categoría";

  const loadCatalog = useCallback(async () => {
    try {
      const [lotRows, farmRows, categoryRows] = await Promise.all([
        listLots(),
        listFarms(),
        getExpenseCategories(),
      ]);
      setLots(lotRows);
      setFarms(farmRows);
      setCategories(categoryRows);
    } catch (err) {
      setLoadError(describeFinanceError(err, "No se pudo cargar el catálogo de lotes y categorías"));
    }
  }, []);

  const loadExpenses = useCallback(async (selected: ExpenseFilters) => {
    setLoadError(null);
    try {
      setExpenses(await getExpenses(selected));
    } catch (err) {
      setLoadError(describeFinanceError(err, "No se pudieron cargar los gastos"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadCatalog();
    });
    return () => {
      active = false;
    };
  }, [loadCatalog]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadExpenses(filters);
    });
    return () => {
      active = false;
    };
  }, [filters, loadExpenses]);

  const reload = () => loadExpenses(filters);

  /* ---------------------------------------------------------------- */
  /* Form                                                              */
  /* ---------------------------------------------------------------- */

  const openEditor = (next: Editor) => {
    setEditor(next);
    setForm(next.kind === "create" ? emptyExpenseForm(todayLocal()) : expenseToForm(next.expense));
    setFormErrors({});
    setFormError(null);
    setConfirmation(null);
    setPending(null);
  };

  const closeEditor = () => {
    if (!busy) setEditor(null);
  };

  /** Values the expense and shows the summary; nothing is persisted yet (D24). */
  const startConfirmation = async (input: ExpenseInput, changes: ExpenseChangesInput | null) => {
    setBusy(true);
    try {
      const preview = await previewExpense(previewPayload(input));
      setConfirmation(
        buildExpenseConfirmation({
          lotName: lotName(input.lotId),
          categoryName: categoryName(input.categoryId),
          input,
          preview,
        }),
      );
      setPending({ input, changes });
    } catch (err) {
      setFormError(describeFinanceError(err, "No se pudo valorizar el gasto"));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor) return;

    const result = validateExpenseForm(form);
    if (!result.ok) {
      setFormErrors(result.errors);
      return;
    }
    setFormErrors({});
    setFormError(null);
    const input = result.input;

    if (editor.kind === "create") {
      await startConfirmation(input, null);
      return;
    }

    const changes = expenseChanges(editor.expense, input);
    if (!changes) {
      setFormError("No hay cambios para guardar.");
      return;
    }

    if (editor.kind === "suggest") {
      setBusy(true);
      try {
        await createExpenseSuggestion(editor.expense.id, { kind: "EDICION", changes });
        success("Sugerencia enviada. El gasto no cambia hasta que el administrador la apruebe.", "Gastos");
        setEditor(null);
        await reload();
      } catch (err) {
        setFormError(describeFinanceError(err, "No se pudo enviar la sugerencia"));
      } finally {
        setBusy(false);
      }
      return;
    }

    // Direct edit: a change of amount, currency or grain is revalued, so the user confirms the new value first.
    if (changes.amount !== undefined) {
      await startConfirmation(input, changes);
      return;
    }
    await saveEdit(editor.expense.id, changes);
  };

  const saveEdit = async (id: string, changes: ExpenseChangesInput) => {
    setBusy(true);
    try {
      await updateExpense(id, changes);
      success("Gasto actualizado.", "Gastos");
      setEditor(null);
      await reload();
    } catch (err) {
      setFormError(describeFinanceError(err, "No se pudo actualizar el gasto"));
      setConfirmation(null);
    } finally {
      setBusy(false);
    }
  };

  const confirmSave = async () => {
    if (!editor || !pending) return;
    if (editor.kind === "edit" && pending.changes) {
      await saveEdit(editor.expense.id, pending.changes);
      return;
    }
    setBusy(true);
    try {
      await createExpense(pending.input);
      success("Gasto registrado.", "Gastos");
      setEditor(null);
      await reload();
    } catch (err) {
      setFormError(describeFinanceError(err, "No se pudo registrar el gasto"));
      setConfirmation(null);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Removal                                                           */
  /* ---------------------------------------------------------------- */

  const confirmRemove = async () => {
    if (!removing) return;
    setActionBusy(true);
    try {
      await deleteExpense(removing.id);
      success("Gasto eliminado.", "Gastos");
      setRemoving(null);
      await reload();
    } catch (err) {
      toastError(describeFinanceError(err, "No se pudo eliminar el gasto"), "Gastos");
      setRemoving(null);
    } finally {
      setActionBusy(false);
    }
  };

  const confirmSuggestRemoval = async () => {
    if (!suggestingRemoval) return;
    setActionBusy(true);
    try {
      await createExpenseSuggestion(suggestingRemoval.id, { kind: "BAJA" });
      success("Sugerencia de baja enviada. El gasto sigue vigente hasta que se apruebe.", "Gastos");
      setSuggestingRemoval(null);
      await reload();
    } catch (err) {
      toastError(describeFinanceError(err, "No se pudo enviar la sugerencia"), "Gastos");
      setSuggestingRemoval(null);
    } finally {
      setActionBusy(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Options                                                           */
  /* ---------------------------------------------------------------- */

  const lotOptions = useMemo(
    () => lots.map((lot) => ({ value: lot.id, label: lotNames.get(lot.id) ?? lot.name })),
    [lots, lotNames],
  );

  // New values only accept active categories; an edited expense keeps its current one even if retired.
  const currentCategoryId = editor && editor.kind !== "create" ? editor.expense.categoryId : null;
  const categoryOptions = categories
    .filter((category) => category.active || category.id === currentCategoryId)
    .map((category) => ({
      value: category.id,
      label: category.active ? category.name : `${category.name} (inactiva)`,
    }));

  const editorTitle =
    editor?.kind === "edit"
      ? "Editar gasto"
      : editor?.kind === "suggest"
        ? "Sugerir edición"
        : "Nuevo gasto";
  const submitLabel =
    editor?.kind === "suggest" ? "Enviar sugerencia" : editor?.kind === "edit" ? "Guardar cambios" : "Continuar";

  return (
    <div className="space-y-4">
      <Alert tone="info" title="Gastos manuales por lote">
        {isAdmin
          ? "Cada gasto se imputa a un lote y se valoriza en pesos con los precios del día de carga. Para editar o eliminar un gasto con una sugerencia pendiente, resolvé primero la sugerencia."
          : "Cada gasto se imputa a un lote y se valoriza en pesos con los precios del día de carga. Para modificar o dar de baja un gasto ya cargado, enviá una sugerencia: el administrador la aprueba o la rechaza."}
      </Alert>

      {loadError && (
        <Alert tone="error" title="No se pudieron cargar los datos">
          {loadError}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Gastos"
          subtitle="Los gastos dados de baja no aparecen en el listado."
          action={<Button onClick={() => openEditor({ kind: "create" })}>Nuevo gasto</Button>}
        />

        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Lote"
              value={filters.lotId}
              options={[{ value: "", label: "Todos los lotes" }, ...lotOptions]}
              onChange={(e) => setFilters((f) => ({ ...f, lotId: e.target.value }))}
            />
            <SelectField
              label="Categoría"
              value={filters.categoryId}
              options={[
                { value: "", label: "Todas las categorías" },
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ]}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
            />
            <TextField
              label="Desde"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
            <TextField
              label="Hasta"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>

          {loading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={<FinanceIcon />}
              title="Sin gastos"
              subtitle="Todavía no hay gastos cargados para este filtro."
            />
          ) : (
            <Table>
              <thead className="bg-base-subtle text-xs text-ink-soft">
                <tr>
                  <Th>Fecha</Th>
                  <Th>Lote</Th>
                  <Th>Categoría</Th>
                  <Th>Descripción</Th>
                  <Th align="right">Monto</Th>
                  <Th align="right">Valor en pesos</Th>
                  <Th align="right">Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-agro-border">
                {expenses.map((expense) => {
                  const hasPending = expense.pendingSuggestionId !== null;
                  const actions = expenseActions(role, hasPending);
                  return (
                    <tr key={expense.id}>
                      <Td>{formatDay(expense.date)}</Td>
                      <Td>{lotName(expense.lotId)}</Td>
                      <Td>{categoryName(expense.categoryId)}</Td>
                      <Td>
                        <div className="font-medium text-ink">{expense.description}</div>
                        {hasPending && (
                          <div className="mt-1">
                            <Badge tone="wheat">Sugerencia pendiente</Badge>
                          </div>
                        )}
                      </Td>
                      <Td align="right">{formatMoney(expense.amount, expense.unit, expense.grain)}</Td>
                      <Td align="right">
                        <div>{formatArs(expense.amountArs)}</div>
                        <div className="text-xs text-ink-soft">{formatValuedAt(expense.valuedAt)}</div>
                      </Td>
                      <Td align="right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {isAdmin ? (
                            <>
                              <Button
                                variant="secondary"
                                disabled={!actions.edit}
                                onClick={() => openEditor({ kind: "edit", expense })}
                              >
                                Editar
                              </Button>
                              <Button variant="ghost" disabled={!actions.remove} onClick={() => setRemoving(expense)}>
                                Eliminar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                disabled={!actions.suggestEdit}
                                onClick={() => openEditor({ kind: "suggest", expense })}
                              >
                                Sugerir edición
                              </Button>
                              <Button
                                variant="ghost"
                                disabled={!actions.suggestRemove}
                                onClick={() => setSuggestingRemoval(expense)}
                              >
                                Sugerir baja
                              </Button>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
      </Card>

      <Modal
        open={editor !== null}
        onClose={closeEditor}
        title={confirmation ? "Confirmá el gasto" : editorTitle}
        subtitle={
          confirmation
            ? "Revisá la valorización en pesos. No se guarda nada hasta que confirmes."
            : "El gasto queda asociado a la firma de tu sesión."
        }
        widthClass="max-w-xl"
      >
        {confirmation ? (
          <div className="space-y-4">
            {confirmation.stale && (
              <Alert tone="warning">
                El precio proviene de una consulta anterior porque el proveedor no respondió. Si preferís, volvé
                más tarde o cargá el gasto en pesos.
              </Alert>
            )}
            <dl className="divide-y divide-agro-border rounded-lg border border-agro-border text-sm">
              {confirmation.rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 px-3 py-2">
                  <dt className="text-ink-soft">{row.label}</dt>
                  <dd className="text-right font-medium text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            {formError && <Alert tone="error">{formError}</Alert>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmation(null)} disabled={busy}>
                Volver a editar
              </Button>
              <Button onClick={() => void confirmSave()} disabled={busy}>
                {busy ? "Guardando…" : "Confirmar y guardar"}
              </Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Lote"
                value={form.lotId}
                options={lotOptions}
                placeholder="Elegí un lote"
                error={formErrors.lotId}
                onChange={(e) => setForm((f) => ({ ...f, lotId: e.target.value }))}
                disabled={busy}
              />
              <SelectField
                label="Categoría"
                value={form.categoryId}
                options={categoryOptions}
                placeholder="Elegí una categoría"
                error={formErrors.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                disabled={busy}
              />
              <TextField
                label="Fecha"
                type="date"
                value={form.date}
                error={formErrors.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                disabled={busy}
              />
              <TextField
                label="Descripción"
                value={form.description}
                error={formErrors.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ej: Flete a Rosario"
                disabled={busy}
              />
              <TextField
                label="Monto"
                inputMode="decimal"
                value={form.amount}
                error={formErrors.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Ej: 90000"
                disabled={busy}
              />
              <SelectField
                label="Moneda"
                value={form.unit}
                options={UNIT_OPTIONS}
                onChange={(e) => {
                  const unit = e.target.value as ExpenseFormState["unit"];
                  setForm((f) => ({ ...f, unit, grain: unit === "KG_CEREAL" ? f.grain : "" }));
                }}
                disabled={busy}
              />
              {form.unit === "KG_CEREAL" && (
                <SelectField
                  label="Grano"
                  value={form.grain}
                  options={GRAIN_OPTIONS}
                  placeholder="Elegí un grano"
                  error={formErrors.grain}
                  onChange={(e) => setForm((f) => ({ ...f, grain: e.target.value as ExpenseFormState["grain"] }))}
                  disabled={busy}
                />
              )}
            </div>

            {formError && <Alert tone="error">{formError}</Alert>}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={closeEditor} disabled={busy}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Procesando…" : submitLabel}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => void confirmRemove()}
        title="Eliminar gasto"
        message={
          removing
            ? `Se da de baja el gasto "${removing.description}". Deja de contarse en los listados y en la calculadora.`
            : ""
        }
        confirmLabel="Eliminar gasto"
        loading={actionBusy}
      />

      <ConfirmDialog
        open={suggestingRemoval !== null}
        onClose={() => setSuggestingRemoval(null)}
        onConfirm={() => void confirmSuggestRemoval()}
        title="Sugerir baja"
        message={
          suggestingRemoval
            ? `Se envía al administrador la sugerencia de dar de baja "${suggestingRemoval.description}". El gasto sigue vigente hasta que la apruebe.`
            : ""
        }
        confirmLabel="Enviar sugerencia"
        tone="primary"
        loading={actionBusy}
      />
    </div>
  );
}
