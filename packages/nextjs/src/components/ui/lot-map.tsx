"use client";

import { useEffect, useMemo, useRef } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polygon, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { GeoJsonPolygon, LotState } from "@/lib/geo-types";
import {
  LOT_STATE_COLORS,
  boundsForPolygons,
  boundsSignature,
  polygonToLatLngs,
  type LatLngTuple,
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
  farmId: string;
  fallbackCenter: LatLngTuple;
  editing: boolean;
  draft: readonly LatLngTuple[];
  onDraftChange: (vertices: LatLngTuple[]) => void;
};

const vertexIcon = divIcon({
  className: "",
  html: '<span style="display:block;width:16px;height:16px;border:3px solid white;border-radius:50%;background:#1a3323;box-shadow:0 1px 5px #0008"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function LotMap({
  lots,
  selectedLotId,
  onSelectLot,
  emptyLabel,
  farmId,
  fallbackCenter,
  editing,
  draft,
  onDraftChange,
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

  return (
    <div className="relative">
    <MapContainer
      // Never infer a farm point from a free-text location; use the regional fallback.
      center={fallbackCenter}
      zoom={bounds ? undefined : 11}
      bounds={bounds ?? undefined}
      scrollWheelZoom
      className="h-80 w-full"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitBounds bounds={bounds} boundsKey={`${farmId}:${boundsKey}`} fallbackCenter={fallbackCenter} />
      <DrawVertices enabled={editing} vertices={draft} onChange={onDraftChange} />
      {editing && draft.length >= 3 && (
        <Polygon positions={[...draft]} pathOptions={{ color: "#1a3323", weight: 3, fillOpacity: 0.25 }} />
      )}
      {editing && draft.length === 2 && <Polyline positions={[...draft]} pathOptions={{ color: "#1a3323" }} />}
      {editing && draft.map((point, index) => (
        <Marker
          key={index}
          position={point}
          icon={vertexIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const position = event.target.getLatLng();
              onDraftChange(draft.map((vertex, i) => i === index ? [position.lat, position.lng] : vertex));
            },
            click: (event) => event.originalEvent.stopPropagation(),
          }}
        />
      ))}
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
            eventHandlers={{ click: () => { if (!editing) onSelectLot(lot.id); } }}
          />
        );
      })}
    </MapContainer>
    {drawable.length === 0 && !editing && (
      <div className="pointer-events-none absolute left-3 top-3 z-[400] max-w-xs rounded-lg bg-white/90 px-3 py-2 text-xs text-ink-soft shadow-sm">
        {emptyLabel}
      </div>
    )}
    </div>
  );
}

function DrawVertices({ enabled, vertices, onChange }: {
  enabled: boolean;
  vertices: readonly LatLngTuple[];
  onChange: (vertices: LatLngTuple[]) => void;
}) {
  useMapEvents({ click: (event) => {
    if (enabled) onChange([...vertices, [event.latlng.lat, event.latlng.lng]]);
  } });
  return null;
}

/**
 * Frames the geometries once per distinct set. The bounds are read through a ref so
 * the effect can depend on the cheap key alone: depending on the tuple itself would
 * re-frame the map on every render and fight the user's panning.
 */
function FitBounds({
  bounds,
  boundsKey,
  fallbackCenter,
}: {
  bounds: LatLngBoundsTuple | null;
  boundsKey: string;
  fallbackCenter: LatLngTuple;
}) {
  const map = useMap();
  const boundsRef = useRef(bounds);
  const centerRef = useRef(fallbackCenter);
  useEffect(() => {
    boundsRef.current = bounds;
    centerRef.current = fallbackCenter;
  }, [bounds, fallbackCenter]);

  useEffect(() => {
    const current = boundsRef.current;

    if (current) {
      map.fitBounds(current, { padding: [24, 24] });
    } else {
      map.setView(centerRef.current, 11);
    }
  }, [map, boundsKey]);

  return null;
}
