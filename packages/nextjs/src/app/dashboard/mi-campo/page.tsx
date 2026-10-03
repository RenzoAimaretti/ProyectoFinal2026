"use client";

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
import { SatelliteMap } from "@/components/ui/charts";
import { apiGet, type FarmDTO, type LotDTO } from "@/api/client";

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export default function MiCampoPage() {
  const { user } = useAuth();
  const esAdmin = !isClientRole(user?.role);

  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [lotesByFarm, setLotesByFarm] = useState<Record<string, LotDTO[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cliente, setCliente] = useState("");
  const [selected, setSelected] = useState("");
  const [zoom, setZoom] = useState(MIN_ZOOM);

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

          <div className="relative overflow-hidden">
            <div
              className="origin-center transition-transform duration-300"
              style={{ transform: `scale(${zoom})` }}
            >
              <SatelliteMap className="h-64 w-full" />
            </div>

            <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg shadow-float ring-1 ring-agro-border">
              <button
                type="button"
                title="Acercar el mapa"
                aria-label="Acercar el mapa"
                onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
                disabled={zoom >= MAX_ZOOM}
                className="flex h-8 w-8 items-center justify-center bg-card text-ink transition-colors hover:bg-base-subtle disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
              <button
                type="button"
                title="Alejar el mapa"
                aria-label="Alejar el mapa"
                onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
                disabled={zoom <= MIN_ZOOM}
                className="flex h-8 w-8 items-center justify-center border-t border-agro-border bg-card text-ink transition-colors hover:bg-base-subtle disabled:cursor-not-allowed disabled:opacity-40"
              >
                −
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 text-[11px] text-white/85">
              <span>Vista de referencia · no representa la geometría real</span>
              <span>{zoom.toFixed(2)}×</span>
            </div>
          </div>

          <p className="border-t border-agro-border px-5 py-3 text-xs text-ink-soft">
            La imagen es ilustrativa. El dibujo de la geometría real de cada lote está
            <span className="font-semibold text-ink"> Proximamente</span>.
          </p>
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
              <StatRow label="Estado" value={sel.active ? "Activo" : "Inactivo"} />
              <StatRow
                label="Geometría"
                value={sel.coords ? "Disponible en el backend" : "Sin coordenadas cargadas"}
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
