import type { GeoJsonPolygon, GeoJsonPosition, LotState } from "./geo-types";

export type LatLngTuple = [number, number];

export type LatLngBoundsTuple = [LatLngTuple, LatLngTuple];

/**
 * Polygon colours, mirroring the design tokens in `globals.css` so the map reads as
 * part of the app rather than as an embedded widget: sand for bare ground, green for
 * a growing crop, ochre for a treated field, terracotta for a harvested one.
 */
export const LOT_STATE_COLORS: Record<LotState, string> = {
  libre: "#d9c9a8", // --color-agro-sand
  sembrado: "#3a7d44", // --color-agro-green
  aplicado: "#c9a227", // --color-agro-ochre
  cosechado: "#c8754f", // --color-agro-earth
};

export const LOT_STATE_LABELS: Record<LotState, string> = {
  libre: "Libre",
  sembrado: "Sembrado",
  aplicado: "Aplicado",
  cosechado: "Cosechado",
};

/** The order of `doc/vision.md:86`, used for the legend. */
export const LOT_STATES: LotState[] = [
  "libre",
  "sembrado",
  "aplicado",
  "cosechado",
];

/**
 * GeoJSON stores positions as `[longitude, latitude]`; Leaflet wants
 * `[latitude, longitude]`. The swap happens here, once, so the rest of the UI
 * never touches it: a transposed pair puts an Argentine field in the Indian
 * Ocean and no type checker would complain.
 */
export function ringToLatLngs(ring: readonly GeoJsonPosition[]): LatLngTuple[] {
  return ring.map(([longitude, latitude]): LatLngTuple => [latitude, longitude]);
}

export function polygonToLatLngs(polygon: GeoJsonPolygon): LatLngTuple[][] {
  return polygon.coordinates.map(ringToLatLngs);
}

/**
 * Bounds of everything that has a polygon, or `null` when nothing does, so the
 * caller can tell "no geometry yet" from "geometry at the origin".
 */
export function boundsForPolygons(
  polygons: readonly GeoJsonPolygon[],
): LatLngBoundsTuple | null {
  let south = Number.POSITIVE_INFINITY;
  let west = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;

  for (const polygon of polygons) {
    for (const ring of polygon.coordinates) {
      for (const [longitude, latitude] of ring) {
        south = Math.min(south, latitude);
        west = Math.min(west, longitude);
        north = Math.max(north, latitude);
        east = Math.max(east, longitude);
      }
    }
  }

  if (!Number.isFinite(south) || !Number.isFinite(west)) {
    return null;
  }

  return [
    [south, west],
    [north, east],
  ];
}

/**
 * How many of the given lots still have no geometry. Treats an absent field the
 * same as an explicit `null`: a counter that under-reports because the payload
 * omitted the field would be a quietly wrong number, which is worse than a
 * missing one.
 */
export function countUndelimited(
  lots: readonly { polygon?: GeoJsonPolygon | null }[],
): number {
  return lots.filter(
    (lot) => lot.polygon === null || lot.polygon === undefined,
  ).length;
}
