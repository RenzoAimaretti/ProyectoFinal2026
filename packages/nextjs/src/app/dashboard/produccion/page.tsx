"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  HeroBand,
  Modal,
  type Tone,
} from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/form";
import { navItems } from "@/components/ui/nav";
import {
  AlertIcon,
  InputsIcon,
  PlusIcon,
  ProductionIcon,
  RefreshIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  apiGet,
  createDailyReport,
  listInputs,
  listRecipesByLot,
  type FarmDTO,
  type InputDTO,
  type LotDTO,
  type RecipeDTO,
  type TaskDTO,
  type TaskTypeDTO,
} from "@/api/client";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Estado = "done" | "current" | "next";

type Labor = {
  id: string;
  startedAt: string | null;
  finishedAt: string | null;
  tarea: string;
  cliente: string;
  lote: string;
  detalle: string;
  estado: Estado;
};

const estadoMap: Record<TaskDTO["status"], Estado> = {
  FINALIZADA: "done",
  EN_PROGRESO: "current",
  PENDIENTE: "next",
  CANCELADA: "next",
};

const estadoBadge: Record<Estado, { label: string; tone: Tone }> = {
  done: { label: "Completado", tone: "green" },
  current: { label: "En curso", tone: "wheat" },
  next: { label: "Programado", tone: "slate" },
};

const dateTimeFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 16).replace("T", " ") : dateTimeFmt.format(d);
}

function buildLabores(
  tasks: TaskDTO[],
  lots: LotDTO[],
  taskTypes: TaskTypeDTO[],
  farms: FarmDTO[],
): Labor[] {
  const lotById = new Map(lots.map((l) => [l.id, l]));
  const ttById = new Map(taskTypes.map((t) => [t.id, t]));
  const farmById = new Map(farms.map((f) => [f.id, f]));

  return tasks
    .map((task) => {
      const lot = lotById.get(task.lotId);
      const tt = ttById.get(task.taskTypeId);
      const farm = lot ? farmById.get(lot.farmId) : undefined;
      return {
        id: task.id,
        startedAt: task.startedAt,
        finishedAt: task.finishedAt,
        tarea: tt?.name ?? "Labor",
        cliente: farm?.name ?? "—",
        lote: lot?.name ?? "—",
        detalle: [lot ? `${lot.area} ha` : null, tt?.description ?? null]
          .filter(Boolean)
          .join(" · "),
        estado: estadoMap[task.status],
      };
    })
    .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
}

type DraftItem = { key: string; inputId: string; quantity: string };

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProduccionPage() {
  const toast = useToast();

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [lots, setLots] = useState<LotDTO[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskTypeDTO[]>([]);
  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [inputs, setInputs] = useState<InputDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [selectedLotId, setSelectedLotId] = useState("");
  const [recipes, setRecipes] = useState<RecipeDTO[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesError, setRecipesError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setRecipesLoading(true);
    setRecipesError(null);
    setVersion((v) => v + 1);
  }, []);

  // Cargar parte modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createTaskId, setCreateTaskId] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createHectares, setCreateHectares] = useState("");
  const [createHours, setCreateHours] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const draftKey = useRef(0);
  const nextKey = () => `d${draftKey.current++}`;

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<TaskDTO[]>("/tasks"),
      apiGet<LotDTO[]>("/lots"),
      apiGet<TaskTypeDTO[]>("/task-types"),
      apiGet<FarmDTO[]>("/farms"),
      listInputs(),
    ])
      .then(([taskList, lotList, typeList, farmList, inputList]) => {
        if (!alive) return;
        setTasks(taskList);
        setLots(lotList);
        setTaskTypes(typeList);
        setFarms(farmList);
        setInputs(inputList);
        setSelectedLotId((prev) => prev || lotList[0]?.id || "");
      })
      .catch(() => {
        if (alive) {
          setError("No se pudieron cargar las labores y catálogos.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [version]);

  useEffect(() => {
    let alive = true;
    if (!selectedLotId) return;
    listRecipesByLot(selectedLotId)
      .then((data) => {
        if (alive) setRecipes(data);
      })
      .catch(() => {
        if (alive) setRecipesError("No se pudo cargar la receta del lote.");
      })
      .finally(() => {
        if (alive) setRecipesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedLotId, version]);

  const labores = useMemo(
    () => buildLabores(tasks, lots, taskTypes, farms),
    [tasks, lots, taskTypes, farms],
  );
  const enCurso = labores.filter((l) => l.estado === "current").length;
  const completadas = labores.filter((l) => l.estado === "done").length;

  const lotOptions = useMemo(() => {
    const farmById = new Map(farms.map((f) => [f.id, f]));
    return lots.map((lot) => ({
      value: lot.id,
      label: `${lot.name}${lot.farmId && farmById.get(lot.farmId) ? ` · ${farmById.get(lot.farmId)?.name}` : ""}`,
    }));
  }, [lots, farms]);

  const taskOptions = useMemo(() => {
    const lotById = new Map(lots.map((l) => [l.id, l]));
    const ttById = new Map(taskTypes.map((t) => [t.id, t]));
    const farmById = new Map(farms.map((f) => [f.id, f]));
    return tasks.map((task) => {
      const lot = lotById.get(task.lotId);
      const tt = ttById.get(task.taskTypeId);
      const farm = lot ? farmById.get(lot.farmId) : undefined;
      return {
        value: task.id,
        label: `${tt?.name ?? "Labor"} · ${lot?.name ?? "—"}${
          farm ? ` (${farm.name})` : ""
        }`,
      };
    });
  }, [tasks, lots, taskTypes, farms]);

  const inputOptions = inputs.map((i) => ({
    value: i.id,
    label: `${i.name} (${i.unit})`,
  }));

  const activeRecipe = recipes[0] ?? null;

  /* ----- Cargar parte ----- */
  const openCreate = useCallback(() => {
    setCreateTaskId(tasks[0]?.id ?? "");
    setCreateDate(new Date().toISOString().slice(0, 10));
    setCreateHectares("");
    setCreateHours("");
    setDraftItems([{ key: nextKey(), inputId: inputs[0]?.id ?? "", quantity: "" }]);
    setCreateError(null);
    setCreateOpen(true);
  }, [tasks, inputs]);

  const updateDraftItem = (key: string, patch: Partial<DraftItem>) => {
    setDraftItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const addDraftItem = () => {
    const used = new Set(draftItems.map((d) => d.inputId));
    const next = inputs.find((i) => !used.has(i.id));
    setDraftItems((prev) => [
      ...prev,
      { key: nextKey(), inputId: next?.id ?? "", quantity: "" },
    ]);
  };

  const removeDraftItem = (key: string) => {
    setDraftItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.key !== key)));
  };

  const inputOptionsFor = (currentKey: string) => {
    const usedElsewhere = new Set(
      draftItems.filter((d) => d.key !== currentKey).map((d) => d.inputId),
    );
    return inputOptions.map((opt) => ({ ...opt, disabled: usedElsewhere.has(opt.value) }));
  };

  const handleCreate = useCallback(async () => {
    if (creating) return;
    if (!createTaskId) {
      setCreateError("Seleccioná la tarea del parte.");
      return;
    }
    if (!createDate) {
      setCreateError("Indicá la fecha del parte.");
      return;
    }
    const hectares = Number(createHectares);
    const hours = Number(createHours);
    if (!Number.isFinite(hectares) || hectares <= 0) {
      setCreateError("Las hectáreas deben ser un número mayor a cero.");
      return;
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      setCreateError("Las horas deben ser un número mayor a cero.");
      return;
    }
    const complete = draftItems.filter(
      (d) => d.inputId && Number(d.quantity) > 0 && Number.isFinite(Number(d.quantity)),
    );
    if (draftItems.length === 0 || complete.length !== draftItems.length) {
      setCreateError("Cargá al menos un insumo con cantidad mayor a cero.");
      return;
    }
    if (new Set(complete.map((d) => d.inputId)).size !== complete.length) {
      setCreateError("No repitas el mismo insumo en el parte.");
      return;
    }
    const unitById = new Map(inputs.map((i) => [i.id, i.unit]));
    setCreating(true);
    setCreateError(null);
    try {
      await createDailyReport({
        taskId: createTaskId,
        date: createDate,
        hectares,
        hours,
        items: complete.map((d) => ({
          inputId: d.inputId,
          quantity: Number(d.quantity),
          unit: unitById.get(d.inputId),
        })),
      });
      toast.success("Parte cargado", "Queda pendiente de aprobación.");
      setCreateOpen(false);
      setDraftItems([]);
      refresh();
    } catch {
      const message =
        "No se pudo cargar el parte. Revisá los datos e intentá nuevamente.";
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }, [
    creating,
    createTaskId,
    createDate,
    createHectares,
    createHours,
    draftItems,
    inputs,
    toast,
    refresh,
  ]);

  return (
    <DashboardLayout
      title="Producción"
      sidebarItems={navItems}
      breadcrumb="Labores agrícolas y partes diarios"
    >
      <HeroBand
        kicker="Labores y partes"
        title="Producción"
        description="Partes diarios de la campaña, recetas de aplicación cargadas por lote y estado de las labores."
        icon={<ProductionIcon className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">
              {enCurso} en curso
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">
              {completadas} completadas
            </span>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon className="h-4 w-4" />
              Actualizar
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={tasks.length === 0 || inputs.length === 0}
              title={
                tasks.length === 0 || inputs.length === 0
                  ? "Necesitás tareas e insumos cargados para registrar un parte."
                  : undefined
              }
              className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2.5 text-sm font-semibold text-agro-green-deep transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusIcon className="h-4 w-4" />
              Cargar parte
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Timeline de labores */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
              <div>
                <h3 className="font-semibold text-ink">Labores</h3>
                <p className="text-sm text-ink-soft">
                  {labores.length} {labores.length === 1 ? "tarea registrada" : "tareas registradas"}
                </p>
              </div>
              <Badge tone={enCurso > 0 ? "wheat" : "slate"}>{enCurso} en curso</Badge>
            </div>

            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">Cargando labores…</p>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <span className="text-agro-earth-dark">
                  <AlertIcon className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-agro-earth-dark">{error}</p>
                <Button variant="secondary" onClick={refresh}>
                  Reintentar
                </Button>
              </div>
            ) : labores.length === 0 ? (
              <EmptyState
                icon={<ProductionIcon />}
                title="Sin labores"
                subtitle="No hay tareas registradas para este tenant."
              />
            ) : (
              <ol className="relative px-5 py-4">
                <div className="absolute bottom-0 left-[2.7rem] top-0 w-px bg-agro-border" />
                {labores.map((labor) => {
                  const badge = estadoBadge[labor.estado];
                  return (
                    <li key={labor.id} className="relative z-10 mb-5 flex gap-4 last:mb-0">
                      <div className="w-12 shrink-0 pt-0.5 text-xs font-medium text-ink-faint">
                        {fmtDateTime(labor.startedAt)}
                      </div>
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          labor.estado === "done"
                            ? "bg-agro-green"
                            : labor.estado === "current"
                              ? "bg-agro-wheat animate-pulse-soft"
                              : "bg-ink-faint"
                        }`}
                      />
                      <div className="min-w-0 flex-1 rounded-lg border border-agro-border bg-card px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {labor.tarea}
                            </p>
                            <p className="text-xs text-ink-soft">
                              {labor.lote}
                              {labor.cliente !== "—" && (
                                <span className="ml-1 rounded bg-agro-green/5 px-1.5 py-0.5 text-[11px] font-medium text-agro-green-deep ring-1 ring-agro-border">
                                  {labor.cliente}
                                </span>
                              )}
                            </p>
                          </div>
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        </div>
                        {labor.detalle && (
                          <p className="mt-1 text-xs text-ink-faint">{labor.detalle}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        {/* Receta + condiciones */}
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-agro-border px-5 py-4">
              <h3 className="font-semibold text-ink">Receta de aplicación</h3>
              <p className="text-sm text-ink-soft">Cargada por lote</p>
            </div>
            <div className="border-b border-agro-border px-5 py-3">
              <SelectField
                label="Lote"
                value={selectedLotId}
                onChange={(e) => {
                  setRecipesLoading(true);
                  setRecipesError(null);
                  setSelectedLotId(e.target.value);
                }}
                options={lotOptions}
                placeholder="Seleccioná un lote"
                disabled={lots.length === 0}
              />
            </div>
            <div className="p-5">
              {recipesError ? (
                <Alert tone="error">{recipesError}</Alert>
              ) : recipesLoading ? (
                <p className="py-6 text-center text-sm text-ink-soft">Cargando receta…</p>
              ) : !activeRecipe ? (
                <EmptyState
                  icon={<InputsIcon />}
                  title="Sin receta cargada"
                  subtitle={
                    selectedLotId
                      ? "Este lote todavía no tiene una receta de aplicación registrada."
                      : "Seleccioná un lote para ver su receta."
                  }
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-faint">
                      {activeRecipe.date.slice(0, 10)}
                    </span>
                    <Badge tone={activeRecipe.status === "ACTIVA" ? "green" : "slate"}>
                      {activeRecipe.status === "ACTIVA" ? "Activa" : "Archivada"}
                    </Badge>
                  </div>

                  {activeRecipe.items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-agro-border px-3 py-4 text-center text-sm text-ink-soft">
                      La receta no tiene insumos cargados.
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {[...activeRecipe.items]
                        .sort((a, b) => a.loadOrder - b.loadOrder)
                        .map((item, index) => (
                          <li
                            key={`${item.inputId}-${index}`}
                            className="flex items-center justify-between border-b border-dashed border-agro-border pb-2 text-sm last:border-0 last:pb-0"
                          >
                            <span className="text-ink-soft">
                              {item.loadOrder}. {item.inputName}
                            </span>
                            <span className="font-semibold text-ink">
                              {item.dose}
                              {item.unit ? ` ${item.unit}` : ""}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}

                  <div className="flex items-center justify-between border-t border-dashed border-agro-border pt-3 text-sm">
                    <span className="text-ink-soft">Volumen de caldo</span>
                    <span className="font-semibold text-ink">
                      {activeRecipe.sprayVolume} {activeRecipe.sprayVolumeUnit}
                    </span>
                  </div>

                  {activeRecipe.observations && (
                    <p className="rounded-lg bg-base-subtle/60 px-3 py-2 text-xs text-ink-soft">
                      {activeRecipe.observations}
                    </p>
                  )}

                  {recipes.length > 1 && (
                    <p className="text-xs text-ink-faint">
                      Hay {recipes.length} recetas para este lote; se muestra la más reciente.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-agro-border px-5 py-4">
              <h3 className="font-semibold text-ink">Condiciones de aplicación</h3>
            </div>
            <EmptyState
              icon={<InputsIcon />}
              title="Proximamente"
              subtitle="Las condiciones climáticas y de suelo todavía no están modeladas en el sistema."
            />
          </Card>
        </div>
      </div>

      {/* Cargar parte */}
      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="Cargar parte diario"
        subtitle="Queda pendiente de aprobación en la bandeja."
        widthClass="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <span
              className="inline-flex"
              title={
                tasks.length === 0 || inputs.length === 0
                  ? "Necesitás tareas e insumos cargados."
                  : undefined
              }
            >
              <Button
                onClick={() => void handleCreate()}
                disabled={creating || tasks.length === 0 || inputs.length === 0}
              >
                {creating ? "Cargando…" : "Cargar parte"}
              </Button>
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          {createError && <Alert tone="error">{createError}</Alert>}

          <SelectField
            label="Tarea"
            value={createTaskId}
            onChange={(e) => setCreateTaskId(e.target.value)}
            options={taskOptions}
            placeholder="Seleccioná una tarea"
            disabled={creating || tasks.length === 0}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              label="Fecha"
              type="date"
              value={createDate}
              onChange={(e) => setCreateDate(e.target.value)}
              disabled={creating}
            />
            <TextField
              label="Hectáreas"
              type="number"
              min="0"
              step="any"
              value={createHectares}
              onChange={(e) => setCreateHectares(e.target.value)}
              disabled={creating}
            />
            <TextField
              label="Horas"
              type="number"
              min="0"
              step="any"
              value={createHours}
              onChange={(e) => setCreateHours(e.target.value)}
              disabled={creating}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink">Insumos aplicados</h4>
              <span
                className="inline-flex"
                title={
                  draftItems.length >= inputs.length
                    ? "Ya agregaste todos los insumos disponibles."
                    : undefined
                }
              >
                <Button
                  variant="secondary"
                  onClick={addDraftItem}
                  disabled={creating || inputs.length === 0 || draftItems.length >= inputs.length}
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar
                </Button>
              </span>
            </div>

            <ul className="space-y-2">
              {draftItems.map((draft) => (
                <li key={draft.key} className="flex items-end gap-2">
                  <div className="flex-1">
                    <SelectField
                      label="Insumo"
                      value={draft.inputId}
                      onChange={(e) => updateDraftItem(draft.key, { inputId: e.target.value })}
                      options={inputOptionsFor(draft.key)}
                      placeholder="Seleccioná un insumo"
                      disabled={creating}
                    />
                  </div>
                  <div className="w-32">
                    <TextField
                      label="Cantidad"
                      type="number"
                      min="0"
                      step="any"
                      value={draft.quantity}
                      onChange={(e) => updateDraftItem(draft.key, { quantity: e.target.value })}
                      disabled={creating}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraftItem(draft.key)}
                    disabled={creating || draftItems.length <= 1}
                    title={
                      draftItems.length <= 1
                        ? "Debe quedar al menos un insumo."
                        : "Quitar insumo"
                    }
                    className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-agro-border text-ink-soft transition-colors hover:bg-base-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
