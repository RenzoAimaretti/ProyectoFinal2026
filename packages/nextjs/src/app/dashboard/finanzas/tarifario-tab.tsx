"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, useToast } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, Card, CardHeader, EmptyState, Modal } from "@/components/ui/primitives";
import { Table, Td, Th } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FinanceIcon } from "@/components/ui/icons";
import {
  ApiError,
  deleteTariff,
  getTariffKgEquivalents,
  getTariffs,
  listLaborTypes,
  putTariff,
  type Grain,
  type LaborTypeDTO,
  type TariffDTO,
  type TariffKgEquivalentDTO,
  type TariffKgEquivalentsDTO,
} from "@/api/client";
import {
  BASIS_LABELS,
  GRAINS,
  GRAIN_LABELS,
  UNIT_LABELS,
  formatArs,
  formatKgPerBasis,
  formatTariffComponent,
} from "./format";
import {
  emptyTariffForm,
  tariffToForm,
  validateTariffForm,
  type TariffFormErrors,
  type TariffFormState,
  type TariffSideForm,
} from "./tariff-form";

const DEFAULT_GRAIN: Grain = "SOJA";

const UNIT_OPTIONS = (Object.keys(UNIT_LABELS) as Array<keyof typeof UNIT_LABELS>).map((value) => ({
  value,
  label: UNIT_LABELS[value],
}));

const BASIS_OPTIONS = (Object.keys(BASIS_LABELS) as Array<keyof typeof BASIS_LABELS>).map((value) => ({
  value,
  label: BASIS_LABELS[value],
}));

const GRAIN_OPTIONS = GRAINS.map((value) => ({ value, label: GRAIN_LABELS[value] }));

function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    if (err.status === 403) return "No tenés permisos para administrar el tarifario.";
    if (err.status === 400 || err.status === 404) {
      const body = err.body as { message?: unknown } | null;
      if (body && typeof body.message === "string") return body.message;
    }
    return `${fallback} (código ${err.status}).`;
  }
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

type SideFieldsProps = {
  legend: string;
  side: TariffSideForm;
  error?: string;
  disabled: boolean;
  onChange: (side: TariffSideForm) => void;
};

function SideFields({ legend, side, error, disabled, onChange }: SideFieldsProps) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-agro-border p-3">
      <legend className="px-1 text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Importe"
          inputMode="decimal"
          value={side.amount}
          onChange={(e) => onChange({ ...side, amount: e.target.value })}
          placeholder="Ej: 12"
          error={error}
          disabled={disabled}
        />
        <SelectField
          label="Moneda"
          value={side.unit}
          options={UNIT_OPTIONS}
          onChange={(e) => {
            const unit = e.target.value as TariffSideForm["unit"];
            onChange({ ...side, unit, grain: unit === "KG_CEREAL" ? side.grain : "" });
          }}
          disabled={disabled}
        />
        {side.unit === "KG_CEREAL" && (
          <SelectField
            label="Grano"
            value={side.grain}
            options={GRAIN_OPTIONS}
            placeholder="Elegí un grano"
            onChange={(e) => onChange({ ...side, grain: e.target.value as TariffSideForm["grain"] })}
            disabled={disabled}
          />
        )}
        <SelectField
          label="Base"
          value={side.basis}
          options={BASIS_OPTIONS}
          onChange={(e) => onChange({ ...side, basis: e.target.value as TariffSideForm["basis"] })}
          disabled={disabled}
        />
      </div>
    </fieldset>
  );
}

export function TarifarioTab() {
  const { success, error: toastError } = useToast();

  const [laborTypes, setLaborTypes] = useState<LaborTypeDTO[]>([]);
  const [tariffs, setTariffs] = useState<TariffDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The grain selector is UI-only: it is never written to the server.
  const [grain, setGrain] = useState<Grain>(DEFAULT_GRAIN);
  const [equivalents, setEquivalents] = useState<TariffKgEquivalentsDTO | null>(null);
  const [equivalentsFailed, setEquivalentsFailed] = useState(false);

  const [editing, setEditing] = useState<LaborTypeDTO | null>(null);
  const [form, setForm] = useState<TariffFormState>(emptyTariffForm());
  const [formErrors, setFormErrors] = useState<TariffFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [removing, setRemoving] = useState<LaborTypeDTO | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [types, rows] = await Promise.all([listLaborTypes(), getTariffs()]);
      setLaborTypes(types);
      setTariffs(rows);
    } catch (err) {
      setLoadError(describeError(err, "No se pudo cargar el tarifario"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEquivalents = useCallback(async (selected: Grain) => {
    try {
      const result = await getTariffKgEquivalents(selected);
      setEquivalents(result);
      setEquivalentsFailed(false);
    } catch {
      setEquivalents(null);
      setEquivalentsFailed(true);
    }
  }, []);

  useEffect(() => {
    // Defer so the effect does not synchronously update render state.
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadEquivalents(grain);
    });
    return () => {
      active = false;
    };
  }, [grain, loadEquivalents, tariffs]);

  const tariffByLabor = useMemo(() => new Map(tariffs.map((t) => [t.laborTypeId, t])), [tariffs]);
  const equivalentByLabor = useMemo(() => {
    const map = new Map<string, TariffKgEquivalentDTO>();
    for (const item of equivalents?.items ?? []) map.set(item.laborTypeId, item);
    return map;
  }, [equivalents]);

  const openEditor = (laborType: LaborTypeDTO) => {
    const existing = tariffByLabor.get(laborType.id);
    setEditing(laborType);
    setForm(existing ? tariffToForm(existing) : emptyTariffForm());
    setFormErrors({});
    setFormError(null);
  };

  const closeEditor = () => {
    if (!saving) setEditing(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;

    const result = validateTariffForm(form);
    if (!result.ok) {
      setFormErrors(result.errors);
      return;
    }

    setFormErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await putTariff(editing.id, result.input);
      success("Tarifa guardada. Solo afecta valorizaciones futuras.", "Tarifario");
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(describeError(err, "No se pudo guardar la tarifa"));
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemovingBusy(true);
    try {
      await deleteTariff(removing.id);
      success("Tarifa eliminada.", "Tarifario");
      setRemoving(null);
      await load();
    } catch (err) {
      toastError(describeError(err, "No se pudo eliminar la tarifa"), "Tarifario");
    } finally {
      setRemovingBusy(false);
    }
  };

  const grainLabel = GRAIN_LABELS[grain];

  return (
    <div className="space-y-4">
      <Alert tone="info" title="Cómo se aplican las tarifas">
        Editar una tarifa solo afecta valorizaciones futuras: lo ya valorizado conserva sus importes.
        Cada tipo de labor tiene una sola tarifa, con precio y costo estándar (0 es un valor válido).
      </Alert>

      {loadError && (
        <Alert tone="error" title="No se pudo cargar el tarifario">
          {loadError}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Tarifas por tipo de labor"
          subtitle={`Los equivalentes se expresan en kilos de ${grainLabel.toLowerCase()} con el precio de pizarra.`}
          action={
            <div className="w-44">
              <SelectField
                label="Grano de referencia"
                value={grain}
                options={GRAIN_OPTIONS}
                onChange={(e) => setGrain(e.target.value as Grain)}
              />
            </div>
          }
        />

        <div className="space-y-3 p-4">
          {equivalentsFailed && (
            <Alert tone="warning">No se pudieron calcular los equivalentes en kilos. Reintentá más tarde.</Alert>
          )}
          {equivalents && equivalents.grainArsPerTon === null && (
            <Alert tone="warning">
              No hay precio de pizarra para {grainLabel.toLowerCase()}: no se pueden calcular los equivalentes.
            </Alert>
          )}
          {equivalents && equivalents.grainArsPerTon !== null && (
            <p className="text-xs text-ink-soft">
              {grainLabel}: {formatArs(equivalents.grainArsPerTon)} por tonelada.
            </p>
          )}

          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : laborTypes.length === 0 ? (
            <EmptyState
              icon={<FinanceIcon />}
              title="Sin tipos de labor"
              subtitle="Creá tipos de labor en el módulo Labores para poder asignarles una tarifa."
            />
          ) : (
            <Table>
              <thead className="bg-base-subtle text-xs text-ink-soft">
                <tr>
                  <Th>Tipo de labor</Th>
                  <Th>Precio</Th>
                  <Th>Costo estándar</Th>
                  <Th>Precio en kg de {grainLabel.toLowerCase()}</Th>
                  <Th>Costo en kg de {grainLabel.toLowerCase()}</Th>
                  <Th align="right">Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-agro-border">
                {laborTypes.map((laborType) => {
                  const tariff = tariffByLabor.get(laborType.id);
                  const equivalent = equivalentByLabor.get(laborType.id);
                  return (
                    <tr key={laborType.id}>
                      <Td className="font-medium text-ink">{laborType.name}</Td>
                      <Td>{tariff ? formatTariffComponent(tariff.price) : "Sin tarifa"}</Td>
                      <Td>{tariff ? formatTariffComponent(tariff.cost) : "Sin tarifa"}</Td>
                      <Td>{tariff ? formatKgPerBasis(equivalent?.priceKg, tariff.price.basis) : "—"}</Td>
                      <Td>{tariff ? formatKgPerBasis(equivalent?.costKg, tariff.cost.basis) : "—"}</Td>
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => openEditor(laborType)}>
                            {tariff ? "Editar" : "Cargar tarifa"}
                          </Button>
                          {tariff && (
                            <Button variant="ghost" onClick={() => setRemoving(laborType)}>
                              Quitar
                            </Button>
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
        open={editing !== null}
        onClose={closeEditor}
        title={editing ? `Tarifa de ${editing.name}` : "Tarifa"}
        subtitle="La tarifa queda asociada a la firma de tu sesión."
        widthClass="max-w-xl"
      >
        <form className="space-y-4" onSubmit={submit}>
          <SideFields
            legend="Precio"
            side={form.price}
            error={formErrors.price}
            disabled={saving}
            onChange={(price) => setForm((f) => ({ ...f, price }))}
          />
          <SideFields
            legend="Costo estándar"
            side={form.cost}
            error={formErrors.cost}
            disabled={saving}
            onChange={(cost) => setForm((f) => ({ ...f, cost }))}
          />

          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={closeEditor} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar tarifa"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => void confirmRemove()}
        title="Quitar tarifa"
        message={
          removing
            ? `Se elimina la tarifa de ${removing.name}. Las valorizaciones ya calculadas no cambian.`
            : ""
        }
        confirmLabel="Quitar tarifa"
        loading={removingBusy}
      />
    </div>
  );
}
