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
import {
  CheckIcon,
  FieldIcon,
  MapZoomIcon,
  RefreshIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { isClientRole, navItems } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import { SatelliteMap } from "@/components/ui/charts";
import { apiGet, type FarmDTO, type LotDTO } from "@/api/client";

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

function hasGeometry(lot: LotDTO): boolean {
  return Boolean(lot.coords && lot.coords.trim());
}

function geometryLabel(lot: LotDTO): string {
  return hasGeometry(lot) ? "Coordenadas cargadas" : "Sin coordenadas";
}

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

      {/* Master–detail */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="overflow-hidden border border-agro-border bg-card">
          <div className="border-b border-agro-border px-5 py-4">
            <div className="skeleton h-4 w-44" />
          </div>
          <div className="flex gap-3 border-b border-agro-border px-5 py-3">
            <div className="skeleton h-11 flex-1" />
            <div className="skeleton h-11 w-40" />
          </div>
          <ul className="divide-y divide-agro-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-4">
                <div className="skeleton h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden border border-agro-border bg-card">
          <div className="border-b border-agro-border px-5 py-4">
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 w-28" />
                </div>
              ))}
            </div>
            <div className="skeleton h-28 w-full" />
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

  const [farms, setFarms] = useState<FarmDTO[]>([]);
  const [lotesByFarm, setLotesByFarm] = useState<Record<string, LotDTO[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [cliente, setCliente] = useState("");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");

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
  const conGeometria = lotesActuales.filter(hasGeometry).length;
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

  const onFarmChange = useCallback(
    (id: string) => {
      setCliente(id);
      setQuery("");
      setSelected(lotesByFarm[id]?.[0]?.id ?? "");
    },
    [lotesByFarm],
  );

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
                const geo = hasGeometry(l);
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(l.id)}
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
                          {isSel && <span className="op-label shrink-0">Seleccionado</span>}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-soft">
                          <span className="op-num">{haFmt.format(l.area ?? 0)} ha</span>
                          <span aria-hidden="true">·</span>
                          <span className={geo ? "op-field-text" : ""}>
                            {geo ? "Con coordenadas" : "Sin coordenadas"}
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
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <div className="space-y-3">
                <StatRow label="Establecimiento" value={currentFarm.name} />
                <StatRow label="Superficie" value={`${haFmt.format(sel.area ?? 0)} ha`} />
                <StatRow label="Estado" value={sel.active ? "Activo" : "Inactivo"} />
                <StatRow label="Geometría" value={geometryLabel(sel)} />
              </div>

              <figure className="order-first sm:order-last">
                <div className="overflow-hidden rounded-lg border border-agro-border">
                  <SatelliteMap className="h-28 w-full" />
                </div>
                <figcaption className="mt-2">
                  <span className="op-label">Referencia</span>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Imagen ilustrativa; no representa la geometría real del lote.
                  </p>
                </figcaption>
              </figure>
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
            label="Con coordenadas cargadas"
            value={String(conGeometria)}
            hint={sinGeometria === 0 ? "Todos los lotes" : `${sinGeometria} sin coordenadas`}
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
              {i > 0 && (
                <span className="h-1 w-1 rounded-full bg-ink-faint" aria-hidden="true" />
              )}
              {item}
            </li>
          ))}
        </ul>
      </section>
    </DashboardLayout>
  );
}
