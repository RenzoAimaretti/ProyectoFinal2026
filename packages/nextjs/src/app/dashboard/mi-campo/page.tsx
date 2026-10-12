"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Card,
  EmptyState,
  KpiCard,
  StatRow,
} from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import { Spinner } from "@/components/ui/spinner";
import { FieldIcon, MapZoomIcon } from "@/components/ui/icons";
import { isClientRole, navItems } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import {
  LOT_STATE_COLORS,
  LOT_STATE_LABELS,
  LOT_STATES,
  countUndelimited,
} from "@/lib/lot-map";
import { apiGet, type FarmDTO, type LotDTO } from "@/api/client";

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

  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [lotesByFarm, setLotesByFarm] = useState<Record<string, LotDTO[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cliente, setCliente] = useState("");
  const [selected, setSelected] = useState("");

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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
            <div>
              <p className="font-medium text-ink">Establecimiento &quot;{currentFarm.name}&quot;</p>
              <p className="text-xs text-ink-soft">
                {lotesActuales.length} lotes
                {currentFarm.location ? ` · ${currentFarm.location}` : ""}
              </p>
            </div>
            {esAdmin ? (
              <div className="flex flex-wrap overflow-hidden rounded-lg bg-base-subtle p-0.5 ring-1 ring-agro-border">
                {farms.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setCliente(f.id);
                      const firstId = lotesByFarm[f.id]?.[0]?.id;
                      setSelected(firstId ?? "");
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                      currentFarm.id === f.id
                        ? "bg-agro-green text-white shadow-sm"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            ) : (
              <Badge tone="green">{currentFarm.name}</Badge>
            )}
          </div>

          {/* Selector de lotes del establecimiento */}
          {lotesActuales.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-agro-border bg-base-subtle/40 px-5 py-2.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Lotes
              </span>
              {lotesActuales.map((l) => {
                const isActive = sel?.id === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelected(l.id)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-agro-green bg-agro-green text-white"
                        : "border-agro-border bg-card text-ink-soft hover:border-agro-green/50 hover:text-ink"
                    }`}
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
                  </button>
                );
              })}
            </div>
          )}

          <LotMap
            lots={lotesActuales}
            selectedLotId={sel?.id ?? null}
            onSelectLot={setSelected}
            emptyLabel="Todavía no hay ningún lote con el polígono delimitado en este campo."
          />

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
          <div className="border-b border-agro-border px-5 py-4">
            <h3 className="font-semibold text-ink">
              {sel ? `Lote ${sel.name}` : "Sin lote seleccionado"}
            </h3>
            <p className="text-sm text-ink-soft">Datos reales del lote desde /lots</p>
          </div>
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
          <div className="border-b border-agro-border px-5 py-4">
            <h3 className="font-semibold text-ink">Cultivos y rotaciones</h3>
          </div>
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
