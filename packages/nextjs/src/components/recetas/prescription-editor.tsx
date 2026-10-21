"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import { SelectField, TextField, TextareaField } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusIcon, RefreshIcon, XIcon } from "@/components/ui/icons";
import {
  ApiError,
  DOSAGE_BASIS_LABELS,
  DOSAGE_BASIS_VALUE_LIST,
  createRecipe,
  getRecipe,
  listInputs,
  updateRecipe,
  type DosageBasis,
  type InputDTO,
  type RecipeDetailDTO,
  type TaskDTO,
} from "@/api/client";
import {
  baseDosageUnit,
  computeLiveTotals,
  dateKeyToIso,
  formatNumber,
  formatWithUnit,
  isPositiveFinite,
  isoToDateKey,
  normalizeDosageUnit,
  parsePositiveNumber,
  todayKey,
} from "./prescription-calc";

/** Everything the editor needs to know about the task it prescribes. */
export type EditorContext = {
  taskId: string;
  laborTypeName: string;
  farmName: string;
  lotName: string;
  /**
   * Task-lot surface in hectares. In CREATE it comes from the pending inbox row
   * (`GET /prescriptions/pending`); in EDIT the editor prefers the area on the
   * loaded recipe (`GET /recipes/:id`) and falls back to this value.
   */
  lotArea: number | null;
  /** Task execution status; drives the frozen read-only mode in EDIT. */
  status: TaskDTO["status"];
  startedAt: string | null;
};

type RowState = {
  key: string;
  inputId: string;
  dose: string;
  dosageBasis: DosageBasis;
  /**
   * Base unit of the row, taken from the selected catalogue product (or the
   * loaded row when editing). The rate unit the server saves is derived from it
   * and the basis with `normalizeDosageUnit`, so the raw catalogue unit is never
   * shown next to a basis.
   */
  unit: string;
};

const BASIS_OPTIONS = DOSAGE_BASIS_VALUE_LIST.map((value) => ({
  value,
  label: DOSAGE_BASIS_LABELS[value],
}));

const FROZEN_STATUSES: ReadonlyArray<TaskDTO["status"]> = [
  "EN_PROGRESO",
  "FINALIZADA",
];

function isFrozenStatus(status: TaskDTO["status"]): boolean {
  return FROZEN_STATUSES.includes(status);
}

function extractApiMessage(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === "string") return body.trim() || null;
  if (typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message)) {
      const parts = message.filter((part): part is string => typeof part === "string");
      if (parts.length > 0) return parts.join(" ");
    }
  }
  return null;
}

type ApiErrorInfo = { message: string; frozen: boolean };

/** Surfaces the real API message and flags the 409 "prescription frozen" case. */
function describeApiError(err: unknown): ApiErrorInfo {
  if (err instanceof ApiError) {
    const apiMessage = extractApiMessage(err.body);
    switch (err.status) {
      case 400:
        return { message: apiMessage ?? "Los datos enviados no son válidos.", frozen: false };
      case 401:
        return { message: "Tu sesión expiró. Volvé a iniciar sesión.", frozen: false };
      case 403:
        return {
          message: "Tu rol no tiene permiso para guardar recetas.",
          frozen: false,
        };
      case 404:
        return {
          message: apiMessage ?? "La actividad o la receta ya no existen.",
          frozen: false,
        };
      case 409:
        return {
          message:
            apiMessage ??
            "La receta quedó congelada porque la actividad ya comenzó.",
          frozen: true,
        };
      default:
        return {
          message: apiMessage ?? `No se pudo guardar la receta (código ${err.status}).`,
          frozen: false,
        };
    }
  }
  return {
    message: "No se pudo guardar la receta. Revisá tu conexión e intentá nuevamente.",
    frozen: false,
  };
}

/**
 * Prescription editor. Handles CREATE (a pending task) and EDIT (an existing
 * prescription). The form follows the agronomist's sequence — application data,
 * then products with their dose and basis, then the caldo per hectare — and the
 * live results are shown below, where every row displays the three faces of the
 * same number (total for the lot, per hectare and per 100 L). The live panel
 * mirrors the server calculation exactly (see `prescription-calc.ts`). It is
 * mounted only while open, so a fresh mount always starts from clean state.
 */
export function PrescriptionEditor({
  mode,
  context,
  recipeId,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  context: EditorContext;
  /** EDIT only: the prescription to load from `GET /recipes/:id`. */
  recipeId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const rowKeyRef = useRef(1);

  const [date, setDate] = useState(todayKey);
  const [pest, setPest] = useState("");
  const [crop, setCrop] = useState("");
  const [observations, setObservations] = useState("");
  const [sprayVolume, setSprayVolume] = useState("");
  const [sprayVolumeUnit, setSprayVolumeUnit] = useState("L/ha");
  const [reapplicationIntervalDays, setReapplicationIntervalDays] = useState("");
  const [reapplicationDate, setReapplicationDate] = useState("");
  const [rows, setRows] = useState<RowState[]>([
    { key: "row-0", inputId: "", dose: "", dosageBasis: "POR_HECTAREA", unit: "" },
  ]);

  const [inputs, setInputs] = useState<InputDTO[]>([]);
  const [inputsLoading, setInputsLoading] = useState(true);
  const [inputsError, setInputsError] = useState<string | null>(null);
  const [inputsVersion, setInputsVersion] = useState(0);

  const [loadedLotArea, setLoadedLotArea] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(mode === "edit");
  const [detailError, setDetailError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverFrozen, setServerFrozen] = useState(false);

  // Inputs catalogue. `inputsLoading`/`inputsError` start clean; a retry resets
  // them from the event handler (never synchronously inside the effect).
  useEffect(() => {
    let alive = true;
    listInputs()
      .then((list) => {
        if (alive) setInputs(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (alive) setInputsError("No se pudo cargar el catálogo de insumos.");
      })
      .finally(() => {
        if (alive) setInputsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [inputsVersion]);

  const retryInputs = () => {
    setInputsError(null);
    setInputsLoading(true);
    setInputsVersion((v) => v + 1);
  };

  // Existing prescription (EDIT only). The editor is remounted per target, so
  // the loading/detail state starts fresh and is only updated asynchronously.
  useEffect(() => {
    if (mode !== "edit" || !recipeId) return;
    let alive = true;
    getRecipe(recipeId)
      .then((recipe) => {
        if (!alive) return;
        applyLoadedRecipe(recipe);
      })
      .catch((err) => {
        if (!alive) return;
        setDetailError(describeApiError(err).message);
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });

    function applyLoadedRecipe(recipe: RecipeDetailDTO) {
      setDate(isoToDateKey(recipe.date) || todayKey());
      setPest(recipe.pest ?? "");
      setCrop(recipe.crop ?? "");
      setObservations(recipe.observations ?? "");
      setSprayVolume(String(recipe.sprayVolume));
      setSprayVolumeUnit(recipe.sprayVolumeUnit || "L/ha");
      setReapplicationIntervalDays(
        recipe.reapplicationIntervalDays != null
          ? String(recipe.reapplicationIntervalDays)
          : "",
      );
      setReapplicationDate(isoToDateKey(recipe.reapplicationDate));
      setLoadedLotArea(
        typeof recipe.lotArea === "number" ? recipe.lotArea : null,
      );
      setRows(
        recipe.items.map((item) => ({
          key: `row-${rowKeyRef.current++}`,
          inputId: item.inputId,
          dose: String(item.dose),
          dosageBasis: item.dosageBasis,
          unit: item.unit ?? "",
        })),
      );
    }

    return () => {
      alive = false;
    };
  }, [mode, recipeId]);

  const lotArea = mode === "edit" ? loadedLotArea ?? context.lotArea : context.lotArea;
  const areaUsable = isPositiveFinite(lotArea) ? lotArea : null;
  const sprayVolumeNumber = parsePositiveNumber(sprayVolume);

  const liveTotals = useMemo(
    () =>
      computeLiveTotals(
        sprayVolumeNumber,
        areaUsable,
        rows.map((row) => ({
          dose: parsePositiveNumber(row.dose),
          dosageBasis: row.dosageBasis,
        })),
      ),
    [sprayVolumeNumber, areaUsable, rows],
  );

  const taskFrozen = mode === "edit" && isFrozenStatus(context.status);
  const frozen = taskFrozen || serverFrozen;
  const locked = frozen || submitting || detailLoading;

  const caldoMessage =
    areaUsable === null
      ? "El lote no tiene una superficie (ha) válida registrada: no se puede calcular el caldo."
      : "Ingresá el caldo por hectárea para ver el total del lote.";

  const inputName = (id: string): string | null =>
    inputs.find((candidate) => candidate.id === id)?.name ?? null;

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: `row-${rowKeyRef.current++}`,
        inputId: "",
        dose: "",
        dosageBasis: "POR_HECTAREA",
        unit: "",
      },
    ]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const moveRow = (index: number, delta: number) => {
    setRows((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const updateRow = (key: string, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const changeRowInput = (row: RowState, inputId: string) => {
    const input = inputs.find((candidate) => candidate.id === inputId);
    updateRow(row.key, { inputId, unit: input ? input.unit : row.unit });
  };

  const handleSubmit = async () => {
    if (frozen || submitting) return;

    const errors: Record<string, string> = {};
    if (!date) errors.date = "Indicá la fecha de la receta.";
    const dateIso = dateKeyToIso(date);
    if (!dateIso) errors.date = "La fecha de la receta no es válida.";
    if (sprayVolumeNumber === null) {
      errors.sprayVolume = "El caldo por hectárea debe ser mayor que 0.";
    }
    if (!sprayVolumeUnit.trim()) {
      errors.sprayVolumeUnit = "Indicá la unidad del caldo (por ejemplo L/ha).";
    }
    if (rows.length === 0) {
      errors.items = "Agregá al menos un producto.";
    }
    rows.forEach((row, index) => {
      if (!row.inputId) errors[`row-${index}-inputId`] = "Elegí un producto.";
      if (parsePositiveNumber(row.dose) === null) {
        errors[`row-${index}-dose`] = "La dosis debe ser mayor que 0.";
      }
    });

    let interval: number | null = null;
    if (reapplicationIntervalDays.trim() !== "") {
      const parsed = Number(reapplicationIntervalDays);
      if (!Number.isInteger(parsed) || parsed < 1) {
        errors.reapplicationIntervalDays =
          "El intervalo debe ser un número entero de 1 día o más.";
      } else {
        interval = parsed;
      }
    }

    let reapplyIso: string | undefined;
    if (reapplicationDate) {
      const iso = dateKeyToIso(reapplicationDate);
      if (!iso) {
        errors.reapplicationDate = "La fecha de reaplicación no es válida.";
      } else if (dateIso && new Date(iso) <= new Date(dateIso)) {
        errors.reapplicationDate =
          "La fecha de reaplicación debe ser posterior a la fecha de la receta.";
      } else {
        reapplyIso = iso;
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError("Revisá los campos marcados antes de guardar.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        date: dateIso as string,
        pest: pest.trim() || undefined,
        crop: crop.trim() || undefined,
        observations: observations.trim() || undefined,
        sprayVolume: sprayVolumeNumber as number,
        sprayVolumeUnit: sprayVolumeUnit.trim(),
        reapplicationIntervalDays: interval ?? undefined,
        reapplicationDate: reapplyIso,
        items: rows.map((row, index) => ({
          inputId: row.inputId,
          dose: parsePositiveNumber(row.dose) as number,
          dosageBasis: row.dosageBasis,
          unit: row.unit.trim() || undefined,
          loadOrder: index + 1,
        })),
      };

      if (mode === "create") {
        await createRecipe({ ...body, taskId: context.taskId });
      } else {
        if (!recipeId) throw new ApiError(404, "missing recipe id");
        await updateRecipe(recipeId, body);
      }
      onSaved();
    } catch (err) {
      const info = describeApiError(err);
      if (info.frozen) setServerFrozen(true);
      setFormError(info.message);
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === "create" ? "Escribir receta" : "Editar receta";

  const footer = frozen ? (
    <div className="flex justify-end">
      <button type="button" className="op-btn" onClick={onClose}>
        Cerrar
      </button>
    </div>
  ) : (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        className="op-btn"
        onClick={onClose}
        disabled={submitting}
      >
        Cancelar
      </button>
      <button
        type="button"
        className="op-btn op-btn--primary"
        onClick={() => void handleSubmit()}
        disabled={locked}
        aria-busy={submitting}
      >
        {submitting
          ? "Guardando…"
          : mode === "create"
            ? "Crear receta"
            : "Guardar cambios"}
      </button>
    </div>
  );

  return (
    <Drawer
      open
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={title}
      subtitle={`${context.laborTypeName} · ${context.farmName} · ${context.lotName}`}
      widthClass="max-w-2xl"
      footer={footer}
    >
      <div className="space-y-6 px-5 py-5">
        {frozen && (
          <Alert tone="warning" title="Receta congelada">
            La actividad ya {context.status === "FINALIZADA" ? "finalizó" : "comenzó"}
            {context.startedAt ? ` (inicio registrado)` : ""}. Una vez que la tarea
            arranca, su receta no se puede modificar: sólo puede consultarse.
          </Alert>
        )}

        {formError && (
          <Alert tone="error" title="No se pudo guardar">
            {formError}
          </Alert>
        )}

        {detailLoading ? (
          <DrawerSkeleton />
        ) : detailError ? (
          <Alert tone="error" title="No se pudo cargar la receta">
            {detailError}
          </Alert>
        ) : (
          <>
            {/* 1. Datos de la aplicación */}
            <section className="space-y-3" aria-labelledby="editor-datos">
              <h3 id="editor-datos" className="op-label">
                Datos de la aplicación
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Fecha"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={locked}
                  required
                  error={fieldErrors.date}
                />
                <TextField
                  label="Plaga / objetivo"
                  value={pest}
                  maxLength={120}
                  onChange={(e) => setPest(e.target.value)}
                  disabled={locked}
                  placeholder="Ej.: Chinche verde"
                />
                <TextField
                  label="Cultivo"
                  value={crop}
                  maxLength={120}
                  onChange={(e) => setCrop(e.target.value)}
                  disabled={locked}
                  placeholder="Ej.: Soja"
                  className="sm:col-span-2"
                />
              </div>
              <TextareaField
                label="Observaciones"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                disabled={locked}
                rows={3}
                placeholder="Notas para quien aplica la receta."
              />
            </section>

            {/* 2. Productos */}
            <section className="space-y-3" aria-labelledby="editor-productos">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 id="editor-productos" className="op-label">
                    Productos
                  </h3>
                  <p className="op-caption mt-0.5 max-w-xl">
                    Cargá cada producto con su dosis y su base. El orden de carga es
                    la posición de la fila: usá ↑/↓ para reordenar.
                  </p>
                </div>
                <button
                  type="button"
                  className="op-btn"
                  onClick={addRow}
                  disabled={locked || inputsLoading || inputsError !== null}
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar producto
                </button>
              </div>

              {fieldErrors.items && (
                <p role="alert" className="text-xs font-medium text-agro-earth-text">
                  {fieldErrors.items}
                </p>
              )}

              {inputsError && (
                <Alert tone="error">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{inputsError}</span>
                    <button
                      type="button"
                      className="op-btn op-btn--quiet"
                      onClick={retryInputs}
                    >
                      <RefreshIcon className="h-4 w-4" />
                      Reintentar
                    </button>
                  </div>
                </Alert>
              )}

              {rows.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Todavía no agregaste productos.
                </p>
              ) : (
                <ul className="space-y-3">
                  {rows.map((row, index) => {
                    const rateUnit = normalizeDosageUnit(row.unit, row.dosageBasis);
                    return (
                      <li
                        key={row.key}
                        className="border border-agro-border bg-base-subtle/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="op-caption">
                            Orden de carga{" "}
                            <span className="op-num font-semibold text-ink">
                              {index + 1}
                            </span>
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="op-btn op-btn--quiet h-8 w-8 p-0"
                              onClick={() => moveRow(index, -1)}
                              disabled={locked || index === 0}
                              aria-label={`Subir el producto ${index + 1}`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="op-btn op-btn--quiet h-8 w-8 p-0"
                              onClick={() => moveRow(index, 1)}
                              disabled={locked || index === rows.length - 1}
                              aria-label={`Bajar el producto ${index + 1}`}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="op-btn op-btn--reject h-8 w-8 p-0"
                              onClick={() => removeRow(row.key)}
                              disabled={locked}
                              aria-label={`Quitar el producto ${index + 1}`}
                            >
                              <XIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <SelectField
                            label="Producto"
                            value={row.inputId}
                            onChange={(e) => changeRowInput(row, e.target.value)}
                            options={inputs.map((input) => ({
                              value: input.id,
                              label: input.name,
                            }))}
                            placeholder={
                              inputsLoading ? "Cargando…" : "Elegí un producto"
                            }
                            disabled={locked || inputsLoading}
                            required
                            error={fieldErrors[`row-${index}-inputId`]}
                            className="sm:col-span-2"
                          />
                          <SelectField
                            label="Base de dosificación"
                            value={row.dosageBasis}
                            onChange={(e) =>
                              updateRow(row.key, {
                                dosageBasis: e.target.value as DosageBasis,
                              })
                            }
                            options={BASIS_OPTIONS}
                            disabled={locked}
                          />
                          <TextField
                            label="Dosis"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={row.dose}
                            onChange={(e) => updateRow(row.key, { dose: e.target.value })}
                            disabled={locked}
                            required
                            error={fieldErrors[`row-${index}-dose`]}
                            hint={
                              row.dosageBasis === "CONCENTRACION"
                                ? "Cantidad por cada 100 L de agua: una mezcla al 1 % v/v se ingresa como 1."
                                : "Cantidad por hectárea."
                            }
                          />
                        </div>

                        <p className="mt-2 text-xs text-ink-soft">
                          Dosis expresada como:{" "}
                          <span className="op-num font-semibold text-ink">
                            {rateUnit ?? "sin unidad (definila en el catálogo de insumos)"}
                          </span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 3. Caldo */}
            <section className="space-y-3" aria-labelledby="editor-caldo">
              <h3 id="editor-caldo" className="op-label">
                Caldo
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextField
                  label="Caldo por hectárea"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={sprayVolume}
                  onChange={(e) => setSprayVolume(e.target.value)}
                  disabled={locked}
                  required
                  error={fieldErrors.sprayVolume}
                  hint="Cantidad de agua a aplicar por hectárea."
                  className="sm:col-span-2"
                />
                <TextField
                  label="Unidad"
                  value={sprayVolumeUnit}
                  onChange={(e) => setSprayVolumeUnit(e.target.value)}
                  disabled={locked}
                  required
                  error={fieldErrors.sprayVolumeUnit}
                  placeholder="L/ha"
                />
              </div>

              <div className="op-plate px-4 py-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="op-label">Caldo total del lote</p>
                    {liveTotals.caldoTotal !== null ? (
                      <p className="op-num mt-1 text-2xl font-bold text-ink">
                        {formatNumber(liveTotals.caldoTotal)}{" "}
                        <span className="text-base font-semibold text-ink-soft">L</span>
                      </p>
                    ) : (
                      <p className="mt-1 max-w-md text-sm text-ink-soft">
                        {caldoMessage}
                      </p>
                    )}
                  </div>
                  <p className="op-caption text-right">
                    Superficie del lote (el multiplicador)
                    <br />
                    <span className="op-num text-ink">
                      {areaUsable !== null ? `${formatNumber(areaUsable)} ha` : "sin dato"}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Resultado (live) */}
            <section className="space-y-3" aria-labelledby="editor-resultado">
              <div>
                <h3 id="editor-resultado" className="op-label">
                  Resultado
                </h3>
                <p className="op-caption mt-0.5 max-w-xl">
                  Cuánto va en el caldo y su equivalente por hectárea y por 100 L. Se
                  recalcula a medida que cargás los productos.
                </p>
              </div>

              {rows.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Todavía no agregaste productos: no hay nada que calcular.
                </p>
              ) : (
                <div aria-live="polite">
                  {liveTotals.caldoTotal === null && (
                    <p className="mb-2 text-xs text-ink-soft">{caldoMessage}</p>
                  )}
                  <ul className="divide-y divide-agro-border border border-agro-border">
                    {rows.map((row, index) => {
                      const result = liveTotals.rows[index];
                      const baseUnit = baseDosageUnit(row.unit);
                      const rateUnit = normalizeDosageUnit(row.unit, row.dosageBasis);
                      const perHectareUnit = baseUnit ? `${baseUnit}/ha` : null;
                      const per100LUnit = baseUnit ? `${baseUnit}/100 L` : null;
                      const dose = parsePositiveNumber(row.dose);
                      return (
                        <li key={row.key} className="px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="op-caption">
                                Orden de carga{" "}
                                <span className="op-num font-semibold text-ink">
                                  {index + 1}
                                </span>{" "}
                                · {DOSAGE_BASIS_LABELS[row.dosageBasis]}
                              </p>
                              <p className="truncate text-sm font-semibold text-ink">
                                {inputName(row.inputId) ??
                                  (row.inputId ? "Insumo" : "Producto sin elegir")}
                              </p>
                              <p className="mt-0.5 text-xs text-ink-soft">
                                Dosis:{" "}
                                <span className="op-num text-ink">
                                  {formatWithUnit(dose, rateUnit)}
                                </span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="op-label">Total a cargar</p>
                              <p className="op-num text-lg font-bold text-ink">
                                {formatWithUnit(result?.total ?? null, baseUnit)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 border-t border-agro-border pt-2">
                            <p className="op-caption">
                              Por hectárea:{" "}
                              <span className="op-num text-ink">
                                {formatWithUnit(result?.perHectare ?? null, perHectareUnit)}
                              </span>
                            </p>
                            <p className="op-caption">
                              Por 100 L:{" "}
                              <span className="op-num text-ink">
                                {formatWithUnit(result?.per100L ?? null, per100LUnit)}
                              </span>
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>

            {/* 5. Plan de reaplicación */}
            <section className="space-y-3" aria-labelledby="editor-reaplicacion">
              <h3 id="editor-reaplicacion" className="op-label">
                Plan de reaplicación (opcional)
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Intervalo (días)"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={reapplicationIntervalDays}
                  onChange={(e) => setReapplicationIntervalDays(e.target.value)}
                  disabled={locked}
                  error={fieldErrors.reapplicationIntervalDays}
                  hint="Cada cuántos días reaplicar."
                />
                <TextField
                  label="Fecha de reaplicación"
                  type="date"
                  value={reapplicationDate}
                  onChange={(e) => setReapplicationDate(e.target.value)}
                  disabled={locked}
                  error={fieldErrors.reapplicationDate}
                  hint="Debe ser posterior a la fecha de la receta."
                />
              </div>
            </section>
          </>
        )}
      </div>
    </Drawer>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-16" />
      <Skeleton className="h-28" />
    </div>
  );
}
