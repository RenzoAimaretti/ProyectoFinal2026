"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  KpiCard,
  Modal,
  PageHeader,
  StatRow,
} from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextField } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { FieldIcon, MapZoomIcon } from "@/components/ui/icons";
import { isClientRole, navItems } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import {
  LOT_STATE_COLOR_VARS,
  LOT_STATE_LABELS,
  LOT_STATES,
  countUndelimited,
  farmMapCenter,
  latLngsToPolygon,
  ringToLatLngs,
  distinctDraftVertexCount,
  removeDraftVertex,
  type LatLngTuple,
} from "@/lib/lot-map";
import { apiDelete, apiGet, apiPost, apiPut, ApiError, type FarmDTO, type LotDTO } from "@/api/client";

function lotError(cause: unknown, fallback: string): string {
  const body = cause instanceof ApiError ? cause.body : null;
  const message = body && typeof body === "object" && "message" in body
    ? (body as { message: unknown }).message : null;
  return typeof message === "string" ? message : fallback;
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

export default function MiCampoPage() {
  const { user } = useAuth();
  const esAdmin = !isClientRole(user?.role);
  const canDraw = user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [lotesByFarm, setLotesByFarm] = useState<Record<string, LotDTO[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cliente, setCliente] = useState("");
  const [selected, setSelected] = useState("");
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [farmData, lotData] = await Promise.all([
        apiGet<FarmDTO[]>("/farms"),
        apiGet<LotDTO[]>("/lots"),
      ]);
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
      setError("No se pudieron cargar los establecimientos y lotes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const sinDelimitar = useMemo(
    () => countUndelimited(lotesActuales),
    [lotesActuales],
  );

  const cancelDrawing = () => {
    setEditing(false);
    setDraft([]);
    setSaveError(null);
  };

  /** Opens the create form empty: a stale name from a previous attempt is not a default. */
  const openCreateLot = () => {
    setLotErrorMessage(null);
    setNewName("");
    setNewArea("");
    setAdding(true);
  };

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
      setLotesByFarm((previous) => ({ ...previous,
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
      setLotesByFarm((previous) => ({ ...previous,
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
        title="Mi Campo"
        sidebarItems={navItems}
        breadcrumb="Mapeo SIG y gestión territorial"
      >
        <Card className="flex items-center justify-center p-10">
          <Spinner label="Cargando establecimientos…" />
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title="Mi Campo"
        sidebarItems={navItems}
        breadcrumb="Mapeo SIG y gestión territorial"
      >
        <Alert tone="error" title="No se pudo cargar Mi Campo">
          {error}
        </Alert>
      </DashboardLayout>
    );
  }

  if (!currentFarm) {
    return (
      <DashboardLayout
        title="Mi Campo"
        sidebarItems={navItems}
        breadcrumb="Mapeo SIG y gestión territorial"
      >
        <Card>
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
      title="Mi Campo"
      sidebarItems={navItems}
      breadcrumb="Mapeo SIG y gestión territorial"
    >
      <PageHeader
        title="Mi Campo"
        subtitle={`Gestioná los lotes y su delimitación en ${currentFarm.name}.`}
        action={
          canDraw ? (
            <Button onClick={openCreateLot} disabled={lotBusy}>Agregar lote</Button>
          ) : undefined
        }
      />
      {lotNotice && <Alert tone="warning" className="mb-4" title="Operación completada con aviso">{lotNotice}</Alert>}
      {lotErrorMessage && !adding && !lotToDelete && <Alert tone="error" className="mb-4" title="No se pudo completar la operación">{lotErrorMessage}</Alert>}
      <Modal open={adding} onClose={() => { if (!lotBusy) { setAdding(false); setLotErrorMessage(null); } }} title="Agregar lote" subtitle={`Establecimiento: ${currentFarm.name}`}>
        <form onSubmit={(event) => void createLot(event)} className="space-y-4">
          <TextField
            label="Nombre del lote"
            required
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            disabled={lotBusy}
          />
          <TextField
            label="Superficie declarada (ha)"
            required
            type="number"
            min="0.000001"
            step="any"
            value={newArea}
            onChange={(event) => setNewArea(event.target.value)}
            disabled={lotBusy}
          />
          {lotErrorMessage && <Alert tone="error" title="No se pudo agregar el lote">{lotErrorMessage}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" disabled={lotBusy}>{lotBusy ? "Guardando…" : "Agregar lote"}</Button>
            <Button variant="secondary" disabled={lotBusy} onClick={() => { setAdding(false); setLotErrorMessage(null); }}>Cancelar</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={lotToDelete !== null}
        onClose={() => { if (!lotBusy) { setLotToDelete(null); setLotErrorMessage(null); } }}
        onConfirm={() => void deleteLot()}
        title="Eliminar lote físicamente"
        confirmLabel="Confirmar eliminación"
        loading={lotBusy}
        message={
          <div className="space-y-3">
            <p className="text-ink">
              ¿Eliminar definitivamente el lote {lotToDelete?.name}? Esta acción no se puede deshacer. Si tiene trabajos u otras relaciones, el servidor rechazará la eliminación.
            </p>
            {lotErrorMessage && <Alert tone="error" title="No se pudo eliminar el lote">{lotErrorMessage}</Alert>}
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-3">
          <CardHeader
            title={`Establecimiento "${currentFarm.name}"`}
            subtitle={`${lotesActuales.length} lotes${currentFarm.location ? ` · ${currentFarm.location}` : ""}`}
            action={
              esAdmin ? (
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-base-subtle p-1 ring-1 ring-agro-border">
                  {farms.map((f) => (
                    <Button
                      key={f.id}
                      variant={currentFarm.id === f.id ? "primary" : "ghost"}
                      className="px-3 py-1.5 text-xs"
                      disabled={saving || lotBusy || editing}
                      onClick={() => {
                        cancelDrawing();
                        setSaveNotice(null);
                        setCliente(f.id);
                        const firstId = lotesByFarm[f.id]?.[0]?.id;
                        setSelected(firstId ?? "");
                      }}
                    >
                      {f.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <Badge tone="green">{currentFarm.name}</Badge>
              )
            }
          />

          {/* Selector de lotes del establecimiento */}
          {lotesActuales.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-agro-border bg-base-subtle/40 px-5 py-2.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Lotes
              </span>
              {lotesActuales.map((l) => {
                const isActive = sel?.id === l.id;
                return (
                  <Button
                    key={l.id}
                    variant={isActive ? "primary" : "secondary"}
                    className="px-2.5 py-1.5 text-xs"
                    disabled={saving || lotBusy}
                    onClick={() => selectLot(l.id)}
                  >
                    <span className={`h-2 w-2 rounded-full ${isActive ? "bg-white" : "bg-ink-faint"}`} />
                    {l.name}
                    <span
                      className={`text-[10px] font-medium ${
                        isActive ? "text-white/70" : "text-ink-faint"
                      }`}
                    >
                      {l.area} ha
                    </span>
                  </Button>
                );
              })}
            </div>
          )}

          {canDraw && sel && (
            <div className="border-b border-agro-border px-5 py-3">
              {!editing ? (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={lotBusy} onClick={() => {
                    setDraft(sel.polygon ? ringToLatLngs(sel.polygon.coordinates[0].slice(0, -1)) : []);
                    setSaveError(null);
                    setSaveNotice(null);
                    setEditing(true);
                  }}>
                    {sel.polygon ? "Editar delimitación" : "Dibujar delimitación"}
                  </Button>
                  <Button variant="danger" disabled={lotBusy} onClick={() => { setLotErrorMessage(null); setLotToDelete(sel); }}>Eliminar lote</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-ink-soft">Tocá el mapa para agregar vértices; arrastrá los puntos para ajustar. Podés quitar un vértice del borrador sin cambiar el polígono guardado.</p>
                  {draft.length > 0 && <div aria-label="Vértices del borrador" className="flex flex-wrap gap-2">
                    {draft.map(([lat, lng], index) => (
                      <button key={index} type="button" disabled={saving} aria-label={`Quitar vértice ${index + 1} (${lat.toFixed(5)}, ${lng.toFixed(5)})`} onClick={() => setDraft((previous) => removeDraftVertex(previous, index))} className="rounded-lg border border-agro-border bg-card px-2 py-1 text-xs text-ink hover:border-agro-earth disabled:opacity-50">
                        Vértice {index + 1} · Quitar
                      </button>
                    ))}
                  </div>}
                  {distinctDraftVertexCount(draft) < 3 && <p className="text-xs text-ink-soft">Marcá al menos tres puntos distintos para guardar.</p>}
                  <div className="flex gap-2">
                    <Button disabled={saving || distinctDraftVertexCount(draft) < 3} onClick={() => void savePolygon()}>
                      {saving ? "Guardando…" : "Guardar polígono"}
                    </Button>
                    <Button variant="secondary" disabled={saving} onClick={cancelDrawing}>Cancelar</Button>
                  </div>
                  {saveError && <Alert tone="error" title="No se pudo guardar">{saveError}</Alert>}
                </div>
              )}
            </div>
          )}
          {saveNotice && <Alert tone="warning" title="Guardado con aviso">{saveNotice}</Alert>}
          <LotMap
            lots={lotesActuales}
            selectedLotId={sel?.id ?? null}
            onSelectLot={(id) => { if (!saving && !lotBusy) selectLot(id); }}
            farmId={currentFarm.id}
            fallbackCenter={farmMapCenter(currentFarm.location) ?? [-33.4, -62.3]}
            editing={editing && !saving}
            draft={draft}
            onDraftChange={setDraft}
            emptyLabel="Todavía no hay ningún lote con el polígono delimitado en este campo."
          />
          {!lotesActuales.some((lot) => lot.polygon) && !farmMapCenter(currentFarm.location) && (
            <p className="px-5 py-2 text-xs text-ink-soft">Vista inicial aproximada en Argentina: la ubicación declarada no contiene coordenadas. Navegá hasta el lote antes de marcar puntos.</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-agro-border px-5 py-3 text-xs text-ink-soft">
            {LOT_STATES.map((state) => (
              <span key={state} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm ring-1 ring-black/10"
                  style={{ backgroundColor: `var(${LOT_STATE_COLOR_VARS[state]})` }}
                />
                {LOT_STATE_LABELS[state]}
              </span>
            ))}
            <span className="text-ink-faint">
              {sinDelimitar === 0
                ? `${lotesActuales.length} de ${lotesActuales.length} lotes delimitados`
                : `${sinDelimitar} de ${lotesActuales.length} lotes sin delimitar`}
            </span>
          </div>
        </Card>

        {/* KPIs reales del establecimiento */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-1">
          <KpiCard
            label="Superficie del campo"
            value={`${currentFarm.surface} ha`}
            hint="Superficie declarada en /farms"
            icon={<FieldIcon />}
          />
          <KpiCard
            label="Hectáreas en lotes"
            value={`${totalHa} ha`}
            hint="Suma de superficies de /lots"
            icon={<MapZoomIcon />}
            tone="wheat"
          />
          <KpiCard
            label="Lotes"
            value={String(lotesActuales.length)}
            hint={`${activeLots} activos`}
            icon={<FieldIcon />}
            tone="earth"
          />
          <KpiCard
            label="Ubicación"
            value={currentFarm.location ?? "—"}
            hint="Dato declarado del establecimiento"
            icon={<MapZoomIcon />}
            tone="slate"
          />
        </div>
      </div>

      {/* Detalle real del lote seleccionado */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title={sel ? `Lote ${sel.name}` : "Sin lote seleccionado"}
            subtitle="Datos reales del lote desde /lots"
          />
          {sel ? (
            <div className="space-y-1.5 px-5 py-4">
              <StatRow label="Establecimiento" value={currentFarm.name} />
              <StatRow label="Superficie" value={`${sel.area} ha`} />
              <StatRow
                label="Estado agronómico"
                value={LOT_STATE_LABELS[sel.state]}
              />
              <StatRow label="Activo" value={sel.active ? "Sí" : "No"} />
              <StatRow
                label="Geometría"
                value={sel.polygon ? "Polígono delimitado" : "Sin delimitar"}
              />
            </div>
          ) : (
            <EmptyState
              icon={<FieldIcon />}
              title="Sin lotes"
              subtitle="Este establecimiento todavía no tiene lotes registrados."
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Cultivos y rotaciones" />
          <EmptyState
            icon={<FieldIcon />}
            title="Proximamente"
            subtitle="No hay modelo de cultivo, siembra ni rotación para mostrar."
          />
        </Card>
      </div>

      {/* Proximamente: analitica agronomica */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <EmptyState
            icon={<MapZoomIcon />}
            title="Índice NDVI"
            subtitle="Proximamente. No hay proveedor de imágenes satelitales integrado."
          />
        </Card>
        <Card>
          <EmptyState
            icon={<MapZoomIcon />}
            title="Clima y heladas"
            subtitle="Proximamente. No hay fuente meteorológica conectada."
          />
        </Card>
        <Card>
          <EmptyState
            icon={<MapZoomIcon />}
            title="Humedad de suelo"
            subtitle="Proximamente. No hay sensores ni modelo de suelo."
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
