"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Polygon, TileLayer, useMap } from "react-leaflet";
import type { GeoJsonPolygon, LotState } from "@/lib/geo-types";
import {
  LOT_STATE_COLORS,
  boundsForPolygons,
  boundsSignature,
  polygonToLatLngs,
  type LatLngBoundsTuple,
} from "@/lib/lot-map";

/**
 * Satellite imagery, because that is what a field viewer needs and what the mock
 * this replaces already claimed to be. The endpoint is public and needs no key,
 * which is acceptable for this project; a production deployment would want a tile
 * contract of its own.
 */
const TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TILE_ATTRIBUTION = "Imágenes © Esri, Maxar, Earthstar Geographics";

export type LotMapLot = {
  id: string;
  name: string;
  state: LotState;
  polygon: GeoJsonPolygon | null;
};

export type LotMapProps = {
  lots: readonly LotMapLot[];
  selectedLotId: string | null;
  onSelectLot: (lotId: string) => void;
  emptyLabel: string;
};

export function LotMap({
  lots,
  selectedLotId,
  onSelectLot,
  emptyLabel,
}: LotMapProps) {
  // Only the lots that can actually be drawn, so the map never invents a shape.
  const drawable = useMemo(
    () =>
      lots.flatMap((lot) =>
        lot.polygon ? [{ lot, polygon: lot.polygon }] : [],
      ),
    [lots],
  );

  const bounds = useMemo(
    () => boundsForPolygons(drawable.map((entry) => entry.polygon)),
    [drawable],
  );

  const boundsKey = boundsSignature(bounds);

  if (drawable.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center border-t border-agro-border bg-base-subtle px-6 text-center text-sm text-ink-soft">
        {emptyLabel}
      </div>
    );
  }

  return (
    <MapContainer
      // The initial frame, so the map never renders at zoom 0 before FitBounds runs.
      bounds={bounds ?? undefined}
      scrollWheelZoom
      className="h-80 w-full"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitBounds bounds={bounds} boundsKey={boundsKey} />
      {drawable.map(({ lot, polygon }) => {
        const selected = lot.id === selectedLotId;

        return (
          <Polygon
            key={lot.id}
            positions={polygonToLatLngs(polygon)}
            pathOptions={{
              color: selected ? "#1a3323" : LOT_STATE_COLORS[lot.state],
              weight: selected ? 3 : 1.5,
              fillColor: LOT_STATE_COLORS[lot.state],
              fillOpacity: selected ? 0.55 : 0.35,
            }}
            eventHandlers={{ click: () => onSelectLot(lot.id) }}
          />
        );
      })}
    </MapContainer>
  );
}

/**
 * Frames the geometries once per distinct set. The bounds are read through a ref so
 * the effect can depend on the cheap key alone: depending on the tuple itself would
 * re-frame the map on every render and fight the user's panning.
 */
function FitBounds({
  bounds,
  boundsKey,
}: {
  bounds: LatLngBoundsTuple | null;
  boundsKey: string;
}) {
  const map = useMap();
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  useEffect(() => {
    const current = boundsRef.current;

    if (current) {
      map.fitBounds(current, { padding: [24, 24] });
    }
  }, [map, boundsKey]);

  return null;
}
