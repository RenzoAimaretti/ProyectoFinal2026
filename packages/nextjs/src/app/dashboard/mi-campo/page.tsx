"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KpiCard,
  Modal,
  StatRow,
} from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import {
  CheckIcon,
  FieldIcon,
  MapZoomIcon,
  RefreshIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { isClientRole, navItems } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import {
  LOT_STATE_COLORS,
  LOT_STATE_LABELS,
  LOT_STATES,
  countUndelimited,
  distinctDraftVertexCount,
  farmMapCenter,
  latLngsToPolygon,
  removeDraftVertex,
  ringToLatLngs,
  type LatLngTuple,
} from "@/lib/lot-map";
import {
  ApiError,
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  type FarmDTO,
  type LotDTO,
} from "@/api/client";

/* ------------------------------------------------------------------ */
/* Formatting + lot helpers                                            */
/* ------------------------------------------------------------------ */

const haFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

type SortKey = "name" | "area-desc" | "area-asc" | "active";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Nombre (A–Z)" },
  { value: "area-desc", label: "Superficie (mayor a menor)" },
  { value: "area-asc", label: "Superficie (menor a mayor)" },
  { value: "active", label: "Activos primero" },
];

const ROADMAP_ITEMS = [
  "Cultivos y rotaciones",
  "Índice NDVI",
  "Clima y heladas",
  "Humedad de suelo",
];

function lotError(cause: unknown, fallback: string): string {
  const body = cause instanceof ApiError ? cause.body : null;
  const message = body && typeof body === "object" && "message" in body
    ? (body as { message: unknown }).message
    : null;
  return typeof message === "string" ? message : fallback;
}

/** A lot is delimited once it carries a validated GeoJSON polygon. */
function hasPolygon(lot: LotDTO): boolean {
  return Boolean(lot.polygon && lot.polygon.coordinates.length > 0);
}

/** Leaflet touches `window` when it is imported, so it can only load in the browser. */
const LotMap = dynamic(
  () => import("@/components/ui/lot-map").then((mod) => mod.LotMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full animate-pulse border-t border-agro-border bg-base-subtle" />
    ),
  },
);

/* ------------------------------------------------------------------ */
/* Loading skeleton — mirrors the real layout, no centered spinner     */
/* ------------------------------------------------------------------ */

function MiCampoSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Header plate */}
      <div className="op-plate mb-5 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-6 w-52" />
          </div>
          <div className="flex gap-6">
            <div className="skeleton h-10 w-28" />
            <div className="skeleton h-10 w-28" />
          </div>
        </div>
      </div>

      {/* Map panel */}
      <div className="mb-5 overflow-hidden border border-agro-border bg-card">
        <div className="border-b border-agro-border px-5 py-4">
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="skeleton h-80 w-full" />
      </div>

      {/* Master–detail */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="overflow-hidden border border-agro-border bg-card">
          <div className="border-b border-agro-border px-5 py-4">
            <div className="skeleton h-4 w-44" />
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
        <div className="overflow-hidden border border-agro-border bg-card">
          <div className="border-b border-agro-border px-5 py-4">
            <div className="skeleton h-4 w-36" />
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MiCampoPage() {
  const { user } = useAuth();
  const esAdmin = !isClientRole(user?.role);
  // The field-mapping module is "Mi Campo" to a client and "Campos de clientes" to staff.
  const pageTitle = esAdmin ? "Campos de clientes" : "Mi Campo";
  const canDraw = user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [lotesByFarm, setLotesByFarm] = useState<Record<string, LotDTO[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [cliente, setCliente] = useState("");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  // SIG editor state
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LatLngTuple[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [lotToDelete, setLotToDelete] = useState<LotDTO | null>(null);
  const [lotBusy, setLotBusy] = useState(false);
  const [lotErrorMessage, setLotErrorMessage] = useState<string | null>(null);
  const [lotNotice, setLotNotice] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    // Initial load / retry. State is only written after the await, so the
    // effect does not trigger synchronous cascading renders.
    let alive = true;
    (async () => {
      try {
        const [farmData, lotData] = await Promise.all([
          apiGet<FarmDTO[]>("/farms"),
          apiGet<LotDTO[]>("/lots"),
        ]);
        if (!alive) return;
        const grouped: Record<string, LotDTO[]> = {};
        for (const farm of farmData) {
          grouped[farm.id] = lotData.filter((l) => l.farmId === farm.id);
        }
        setFarms(farmData);
        setLotesByFarm(grouped);
        const firstFarm = farmData[0];
        setCliente(firstFarm?.id ?? "");
        setSelected(firstFarm ? grouped[firstFarm.id]?.[0]?.id ?? "" : "");
      } catch {
        if (alive) {
          setError(
            "No se pudieron cargar los establecimientos y los lotes. Revisá tu conexión e intentá de nuevo.",
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [version]);

  const currentFarm = useMemo(
    () => farms.find((f) => f.id === cliente) ?? farms[0] ?? null,
    [farms, cliente],
  );

  const lotesActuales = useMemo(() => {
    if (!currentFarm) return [];
    return lotesByFarm[currentFarm.id] ?? [];
  }, [currentFarm, lotesByFarm]);

  const sel = useMemo(
    () => lotesActuales.find((l) => l.id === selected) ?? lotesActuales[0] ?? null,
    [lotesActuales, selected],
  );

  const totalHa = useMemo(
    () => lotesActuales.reduce((acc, l) => acc + (l.area ?? 0), 0),
    [lotesActuales],
  );

  const activeLots = lotesActuales.filter((l) => l.active).length;
  const inactiveLots = lotesActuales.length - activeLots;
  const conGeometria = lotesActuales.filter(hasPolygon).length;
  const sinGeometria = lotesActuales.length - conGeometria;

  const declaredHa = currentFarm?.surface ?? 0;
  const deltaHa = totalHa - declaredHa;
  const reconciles = Math.abs(deltaHa) < 0.05;
  const deltaLabel = reconciles
    ? "Coincide con lo declarado"
    : deltaHa > 0
      ? `+${haFmt.format(deltaHa)} ha por encima de lo declarado`
      : `${haFmt.format(Math.abs(deltaHa))} ha sin asignar a lotes`;
  const deltaTone = reconciles ? "op-field-text" : "op-signal-text";

  const lotesVisibles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? lotesActuales.filter((l) => l.name.toLowerCase().includes(q))
      : lotesActuales;
    const ordered = [...base];
    ordered.sort((a, b) => {
      switch (sortKey) {
        case "area-desc":
          return (b.area ?? 0) - (a.area ?? 0) || a.name.localeCompare(b.name, "es");
        case "area-asc":
          return (a.area ?? 0) - (b.area ?? 0) || a.name.localeCompare(b.name, "es");
        case "active":
          return Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "es");
        default:
          return a.name.localeCompare(b.name, "es");
      }
    });
    return ordered;
  }, [lotesActuales, query, sortKey]);

  const sinDelimitar = useMemo(
    () => countUndelimited(lotesActuales),
    [lotesActuales],
  );

  const cancelDrawing = () => {
    setEditing(false);
    setDraft([]);
    setSaveError(null);
  };

  const onFarmChange = useCallback(
    (id: string) => {
      setEditing(false);
      setDraft([]);
      setSaveError(null);
      setSaveNotice(null);
      setCliente(id);
      setQuery("");
      setSelected(lotesByFarm[id]?.[0]?.id ?? "");
    },
    [lotesByFarm],
  );

  const selectLot = (id: string) => {
    cancelDrawing();
    setSaveNotice(null);
    setSelected(id);
  };

  const refreshLots = async () => {
    const lots = await apiGet<LotDTO[]>("/lots");
    setLotesByFarm(Object.fromEntries(farms.map((farm) => [
      farm.id, lots.filter((lot) => lot.farmId === farm.id),
    ])));
  };

  const createLot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canDraw || !currentFarm || lotBusy) return;
    const name = newName.trim();
    const area = Number(newArea);
    if (!name || !newArea.trim() || !Number.isFinite(area) || area <= 0) {
      setLotErrorMessage("Ingresá un nombre y una superficie declarada mayor a cero.");
      return;
    }
    setLotBusy(true);
    setLotErrorMessage(null);
    setLotNotice(null);
    try {
      const created = await apiPost<LotDTO>("/lots", { name, area, farmId: currentFarm.id });
      setLotesByFarm((previous) => ({
        ...previous,
        [currentFarm.id]: [...(previous[currentFarm.id] ?? []), created],
      }));
      setSelected(created.id);
      setAdding(false);
      setNewName("");
      setNewArea("");
      cancelDrawing();
      try {
        await refreshLots();
      } catch {
        setLotNotice("El lote se creó, pero no se pudo actualizar la lista. Recargá la página para sincronizar los datos.");
      }
    } catch (cause) {
      setLotErrorMessage(lotError(cause, "No se pudo crear el lote. Intentá de nuevo."));
    } finally {
      setLotBusy(false);
    }
  };

  const deleteLot = async () => {
    if (!canDraw || !lotToDelete || lotBusy) return;
    const target = lotToDelete;
    setLotBusy(true);
    setLotErrorMessage(null);
    setLotNotice(null);
    try {
      await apiDelete<void>(`/lots/${encodeURIComponent(target.id)}`);
      setLotesByFarm((previous) => ({
        ...previous,
        [target.farmId]: (previous[target.farmId] ?? []).filter((lot) => lot.id !== target.id),
      }));
      if (selected === target.id) setSelected("");
      cancelDrawing();
      setLotToDelete(null);
      try {
        await refreshLots();
      } catch {
        setLotNotice("El lote se eliminó, pero no se pudo actualizar la lista. Recargá la página para sincronizar los datos.");
      }
    } catch (cause) {
      setLotErrorMessage(lotError(cause, "No se pudo eliminar el lote. Intentá de nuevo."));
    } finally {
      setLotBusy(false);
    }
  };

  const savePolygon = async () => {
    if (!sel || !canDraw || saving) return;
    setSaveError(null);
    setSaveNotice(null);
    let polygon;
    try {
      polygon = latLngsToPolygon(draft);
      // The editor moves the exterior only; keep any existing interior rings intact.
      if (sel.polygon?.coordinates.length && sel.polygon.coordinates.length > 1) {
        polygon.coordinates.push(...sel.polygon.coordinates.slice(1));
      }
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Polígono inválido.");
      return;
    }
    setSaving(true);
    try {
      // PUT returns the authoritative polygon and area; keep it even if refresh fails.
      const updated = await apiPut<LotDTO>(`/lots/${encodeURIComponent(sel.id)}`, { polygon });
      setLotesByFarm((previous) => ({
        ...previous,
        [sel.farmId]: (previous[sel.farmId] ?? []).map((lot) =>
          lot.id === sel.id ? { ...lot, ...updated } : lot,
        ),
      }));
      cancelDrawing();
      try {
        await refreshLots();
      } catch {
        setSaveNotice("El polígono se guardó, pero no se pudo actualizar la lista. Recargá la página para sincronizar los datos.");
      }
    } catch (cause) {
      setSaveError(lotError(cause, "No se pudo guardar el polígono. Intentá de nuevo."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title={pageTitle}
        sidebarItems={navItems}
        breadcrumb="Mapeo SIG y gestión territorial"
      >
        <p role="status" className="sr-only">
          Cargando establecimientos y lotes…
        </p>
        <MiCampoSkeleton />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title={pageTitle}
        sidebarItems={navItems}
        breadcrumb="Mapeo SIG y gestión territorial"
      >
        <Card className="p-6">
          <Alert tone="error" title="No se pudo cargar Mi Campo">
            {error}
          </Alert>
          <div className="mt-4">
            <button type="button" onClick={reload} className="op-btn">
              <RefreshIcon className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  if (!currentFarm) {
    return (
      <DashboardLayout
        title={pageTitle}
        sidebarItems={navItems}
        breadcrumb="Mapeo SIG y gestión territorial"
      >
        <Card>
          <h2 className="sr-only">Establecimientos</h2>
          <EmptyState
            icon={<FieldIcon />}
            title="Todavía no hay establecimientos"
            subtitle="Cuando se registren campos y lotes van a aparecer en este módulo."
          />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={pageTitle}
      sidebarItems={navItems}
      breadcrumb="Mapeo SIG y gestión territorial"
    >
      {/* Header: farm + chooser + the declared-vs-loaded relationship */}
      <section className="op-plate mb-5 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="op-label">Establecimiento</p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-ink">
              {currentFarm.name}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {lotesActuales.length}{" "}
              {lotesActuales.length === 1 ? "lote cargado" : "lotes cargados"}
              {currentFarm.location ? ` · ${currentFarm.location}` : ""}
            </p>
          </div>

          {esAdmin && farms.length > 1 ? (
            <label className="flex flex-col gap-1">
              <span className="op-label">Cambiar establecimiento</span>
              <select
                value={currentFarm.id}
                onChange={(e) => onFarmChange(e.target.value)}
                className="op-input min-w-[12rem]"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-agro-border pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <p className="op-label">Superficie declarada del establecimiento</p>
            <p className="op-num mt-1 text-2xl font-bold leading-none text-ink">
              {haFmt.format(declaredHa)}
              <span className="ml-1 text-sm font-medium text-ink-faint">ha</span>
            </p>
          </div>
          <div>
            <p className="op-label">Total de los lotes cargados</p>
            <p className="op-num mt-1 text-2xl font-bold leading-none text-ink">
              {haFmt.format(totalHa)}
              <span className="ml-1 text-sm font-medium text-ink-faint">ha</span>
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 sm:text-right">
            <p className="op-label">Diferencia</p>
            <p className={`mt-1 text-sm font-semibold ${deltaTone}`}>{deltaLabel}</p>
          </div>
        </div>
      </section>

      {/* SIG panel: one real map for the whole farm, with lot editing */}
      <section className="mb-5 overflow-hidden border border-agro-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-agro-border px-5 py-4">
          <div>
            <h2 className="font-display font-semibold text-ink">Delimitación SIG</h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              Vista satelital del establecimiento. Cada lote se pinta según su estado agronómico.
            </p>
          </div>
          {canDraw ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={lotBusy || saving || editing}
                onClick={() => {
                  setLotErrorMessage(null);
                  setAdding(true);
                }}
              >
                Agregar lote
              </Button>
              {sel ? (
                <Button
                  variant="danger"
                  disabled={lotBusy || saving}
                  onClick={() => {
                    setLotErrorMessage(null);
                    setLotToDelete(sel);
                  }}
                >
                  Eliminar lote
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {lotNotice ? (
          <div className="px-5 pt-4">
            <Alert tone="warning" title="Operación completada con aviso">{lotNotice}</Alert>
          </div>
        ) : null}
        {lotErrorMessage && !adding && !lotToDelete ? (
          <div className="px-5 pt-4">
            <Alert tone="error" title="No se pudo completar la operación">{lotErrorMessage}</Alert>
          </div>
        ) : null}

        {canDraw && sel ? (
          <div className="border-b border-agro-border px-5 py-3">
            {!editing ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={lotBusy || saving}
                  onClick={() => {
                    setDraft(sel.polygon ? ringToLatLngs(sel.polygon.coordinates[0].slice(0, -1)) : []);
                    setSaveError(null);
                    setSaveNotice(null);
                    setEditing(true);
                  }}
                >
                  {sel.polygon ? "Editar delimitación" : "Dibujar delimitación"}
                </Button>
                <span className="text-sm text-ink-soft">
                  {sel.polygon
                    ? `Lote ${sel.name}: ${haFmt.format(sel.area ?? 0)} ha delimitadas.`
                    : `Lote ${sel.name} sin delimitar.`}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-ink-soft">
                  Tocá el mapa para agregar vértices; arrastrá los puntos para ajustar. Podés quitar
                  un vértice del borrador sin cambiar el polígono guardado.
                </p>
                {draft.length > 0 ? (
                  <div aria-label="Vértices del borrador" className="flex flex-wrap gap-2">
                    {draft.map(([lat, lng], index) => (
                      <button
                        key={index}
                        type="button"
                        disabled={saving}
                        aria-label={`Quitar vértice ${index + 1} (${lat.toFixed(5)}, ${lng.toFixed(5)})`}
                        onClick={() => setDraft((previous) => removeDraftVertex(previous, index))}
                        className="rounded-lg border border-agro-border bg-card px-2 py-1 text-xs text-ink hover:border-agro-earth disabled:opacity-50"
                      >
                        Vértice {index + 1} · Quitar
                      </button>
                    ))}
                  </div>
                ) : null}
                {distinctDraftVertexCount(draft) < 3 ? (
                  <p className="text-xs text-ink-soft">Marcá al menos tres puntos distintos para guardar.</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={saving || distinctDraftVertexCount(draft) < 3}
                    onClick={() => void savePolygon()}
                  >
                    {saving ? "Guardando…" : "Guardar polígono"}
                  </Button>
                  <Button variant="secondary" disabled={saving} onClick={cancelDrawing}>
                    Cancelar
                  </Button>
                </div>
                {saveError ? <Alert tone="error" title="No se pudo guardar">{saveError}</Alert> : null}
              </div>
            )}
          </div>
        ) : null}

        {saveNotice ? (
          <div className="px-5 pt-4">
            <Alert tone="warning" title="Guardado con aviso">{saveNotice}</Alert>
          </div>
        ) : null}

        <LotMap
          lots={lotesActuales}
          selectedLotId={sel?.id ?? null}
          onSelectLot={(id) => {
            if (!saving && !lotBusy) selectLot(id);
          }}
          farmId={currentFarm.id}
          fallbackCenter={farmMapCenter(currentFarm.location) ?? [-33.4, -62.3]}
          editing={editing && !saving}
          draft={draft}
          onDraftChange={setDraft}
          emptyLabel="Todavía no hay ningún lote con el polígono delimitado en este campo."
        />

        {!lotesActuales.some((lot) => lot.polygon) && !farmMapCenter(currentFarm.location) ? (
          <p className="px-5 py-2 text-xs text-ink-soft">
            Vista inicial aproximada en Argentina: la ubicación declarada no contiene coordenadas.
            Navegá hasta el lote antes de marcar puntos.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-agro-border px-5 py-3 text-xs text-ink-soft">
          {LOT_STATES.map((state) => (
            <span key={state} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm ring-1 ring-black/10"
                style={{ backgroundColor: LOT_STATE_COLORS[state] }}
              />
              {LOT_STATE_LABELS[state]}
            </span>
          ))}
          <span className="ml-auto text-ink-faint">
            {sinDelimitar === 0
              ? `${lotesActuales.length} de ${lotesActuales.length} lotes delimitados`
              : `${sinDelimitar} de ${lotesActuales.length} lotes sin delimitar`}
          </span>
        </div>
      </section>

      {/* Master–detail: searchable/sortable list + adjacent selected lot */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* LEFT — lot list */}
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b border-agro-border px-5 py-4">
            <h2 className="font-display font-semibold text-ink">Lotes del establecimiento</h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              Elegí un lote para ver su detalle al costado.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-b border-agro-border px-5 py-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Buscar lote por nombre</span>
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                aria-hidden="true"
              >
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre…"
                className="op-input w-full pl-9"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="op-label whitespace-nowrap">Ordenar por</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="op-input"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {lotesActuales.length === 0 ? (
            <EmptyState
              icon={<FieldIcon />}
              title="Sin lotes"
              subtitle="Este establecimiento todavía no tiene lotes cargados."
            />
          ) : lotesVisibles.length === 0 ? (
            <EmptyState
              icon={<SearchIcon />}
              title="Sin resultados"
              subtitle="Ningún lote coincide con la búsqueda."
            />
          ) : (
            <ul className="max-h-[28rem] overflow-y-auto">
              {lotesVisibles.map((l) => {
                const isSel = sel?.id === l.id;
                const geo = hasPolygon(l);
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => selectLot(l.id)}
                      aria-current={isSel ? "true" : undefined}
                      className={`flex min-h-[44px] w-full items-center gap-3 border-b border-agro-border px-5 py-3 text-left transition-colors motion-reduce:transition-none ${
                        isSel ? "bg-base-subtle" : "hover:bg-base-subtle/60"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          isSel ? "bg-ink text-card" : "text-ink-faint"
                        }`}
                        aria-hidden="true"
                      >
                        {isSel ? (
                          <CheckIcon className="h-3.5 w-3.5" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-ink">{l.name}</span>
                          {isSel ? <span className="op-label shrink-0">Seleccionado</span> : null}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-soft">
                          <span className="op-num">{haFmt.format(l.area ?? 0)} ha</span>
                          <span aria-hidden="true">·</span>
                          <span className={geo ? "op-field-text" : ""}>
                            {geo ? "Delimitado" : "Sin delimitar"}
                          </span>
                        </span>
                      </span>

                      <Badge tone={l.active ? "green" : "slate"}>
                        {l.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-auto border-t border-agro-border px-5 py-2.5 text-xs text-ink-faint">
            {lotesVisibles.length} de {lotesActuales.length}{" "}
            {lotesActuales.length === 1 ? "lote" : "lotes"}
          </p>
        </Card>

        {/* RIGHT — selected lot detail */}
        <Card className="overflow-hidden">
          <div className="border-b border-agro-border px-5 py-4">
            <h2 className="font-display font-semibold text-ink">
              {sel ? `Lote ${sel.name}` : "Sin lote seleccionado"}
            </h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              {sel ? "Datos del lote elegido" : "Elegí un lote de la lista."}
            </p>
          </div>

          {sel ? (
            <div className="space-y-3 px-5 py-5">
              <StatRow label="Establecimiento" value={currentFarm.name} />
              <StatRow label="Superficie" value={`${haFmt.format(sel.area ?? 0)} ha`} />
              <StatRow label="Estado agronómico" value={LOT_STATE_LABELS[sel.state]} />
              <StatRow label="Activo" value={sel.active ? "Sí" : "No"} />
              <StatRow
                label="Geometría"
                value={sel.polygon ? "Polígono delimitado" : "Sin delimitar"}
              />
            </div>
          ) : (
            <EmptyState
              icon={<FieldIcon />}
              title="Sin lote seleccionado"
              subtitle="Elegí un lote de la lista para ver su detalle."
            />
          )}
        </Card>
      </section>

      {/* KPIs reduced to three: the declared-vs-loaded relationship leads above */}
      <section className="mt-5">
        <h2 className="sr-only">Indicadores del establecimiento</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Lotes cargados"
            value={String(lotesActuales.length)}
            hint={`${activeLots} activos · ${inactiveLots} inactivos`}
            icon={<FieldIcon />}
          />
          <KpiCard
            label="Lotes delimitados"
            value={String(conGeometria)}
            hint={sinGeometria === 0 ? "Todos los lotes" : `${sinGeometria} sin delimitar`}
            icon={<MapZoomIcon />}
            tone="wheat"
          />
          <KpiCard
            label="Lotes inactivos"
            value={String(inactiveLots)}
            hint={inactiveLots === 0 ? "Ninguno fuera de servicio" : "Fuera de servicio"}
            icon={<FieldIcon />}
            tone="earth"
          />
        </div>
      </section>

      {/* Roadmap: four upcoming capabilities collapsed into one strip */}
      <section className="op-plate mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
        <h2 className="op-label">En el roadmap</h2>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          {ROADMAP_ITEMS.map((item, i) => (
            <li key={item} className="flex items-center gap-3">
              {i > 0 ? (
                <span className="h-1 w-1 rounded-full bg-ink-faint" aria-hidden="true" />
              ) : null}
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Add lot modal */}
      <Modal
        open={adding}
        onClose={() => {
          if (!lotBusy) {
            setAdding(false);
            setLotErrorMessage(null);
          }
        }}
        title="Agregar lote"
        subtitle={`Establecimiento: ${currentFarm.name}`}
      >
        <form onSubmit={(event) => void createLot(event)} className="space-y-4">
          <label className="block text-sm font-medium text-ink">
            Nombre del lote
            <input
              required
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              disabled={lotBusy}
              className="mt-1 w-full rounded-lg border border-agro-border bg-card px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Superficie declarada (ha)
            <input
              required
              type="number"
              min="0.000001"
              step="any"
              value={newArea}
              onChange={(event) => setNewArea(event.target.value)}
              disabled={lotBusy}
              className="mt-1 w-full rounded-lg border border-agro-border bg-card px-3 py-2"
            />
          </label>
          {lotErrorMessage ? (
            <Alert tone="error" title="No se pudo agregar el lote">{lotErrorMessage}</Alert>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={lotBusy}>
              {lotBusy ? "Guardando…" : "Agregar lote"}
            </Button>
            <Button
              variant="secondary"
              disabled={lotBusy}
              onClick={() => {
                setAdding(false);
                setLotErrorMessage(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete lot modal */}
      <Modal
        open={lotToDelete !== null}
        onClose={() => {
          if (!lotBusy) {
            setLotToDelete(null);
            setLotErrorMessage(null);
          }
        }}
        title="Eliminar lote físicamente"
      >
        <p className="text-sm text-ink">
          ¿Eliminar definitivamente el lote {lotToDelete?.name}? Esta acción no se puede deshacer.
          Si tiene trabajos u otras relaciones, el servidor rechazará la eliminación.
        </p>
        {lotErrorMessage ? (
          <Alert tone="error" title="No se pudo eliminar el lote">{lotErrorMessage}</Alert>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button variant="danger" disabled={lotBusy} onClick={() => void deleteLot()}>
            {lotBusy ? "Eliminando…" : "Confirmar eliminación"}
          </Button>
          <Button
            variant="secondary"
            disabled={lotBusy}
            onClick={() => {
              setLotToDelete(null);
              setLotErrorMessage(null);
            }}
          >
            Cancelar
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
