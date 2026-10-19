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

/** Remove only the chosen unsaved vertex; the stored polygon is never touched. */
export function removeDraftVertex(vertices: readonly LatLngTuple[], index: number): LatLngTuple[] {
  return vertices.filter((_, vertexIndex) => vertexIndex !== index);
}

/** Number of distinct draft positions; saving needs at least three. */
export function distinctDraftVertexCount(vertices: readonly LatLngTuple[]): number {
  return new Set(vertices.map(([lat, lng]) => `${lat},${lng}`)).size;
}

/** Build a single-ring GeoJSON polygon from Leaflet vertices, without zero-length edges. */
export function latLngsToPolygon(vertices: readonly LatLngTuple[]): GeoJsonPolygon {
  const ring: GeoJsonPosition[] = [];
  for (const [latitude, longitude] of vertices) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("Las coordenadas deben ser latitud y longitud válidas.");
    }
    const last = ring[ring.length - 1];
    if (!last || last[0] !== longitude || last[1] !== latitude) {
      ring.push([longitude, latitude]);
    }
  }
  // An explicit click on the first vertex closes the ring; do not store it twice.
  if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1]) {
    ring.pop();
  }
  if (new Set(ring.map(([lng, lat]) => `${lng},${lat}`)).size < 3) {
    throw new Error("Marcá al menos tres puntos distintos para delimitar el lote.");
  }
  return { type: "Polygon", coordinates: [[...ring, [...ring[0]]]] };
}

/** Only numeric coordinates can be treated as a farm location; a place name is not a point. */
export function farmMapCenter(location: string | null): LatLngTuple | null {
  const match = location?.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? [latitude, longitude] : null;
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
 * A stable, cheap signature of a framed box, for deciding when to reframe. Derived
 * from the bounds themselves rather than from lot ids: an edited polygon keeps its
 * id and its derived state, so a signature built from those misses the edit.
 */
export function boundsSignature(bounds: LatLngBoundsTuple | null): string {
  return bounds === null ? "none" : bounds.flat().join(",");
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
