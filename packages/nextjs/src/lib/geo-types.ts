/**
 * The geospatial vocabulary shared by the API client and the map helpers. It lives
 * on its own so the pure helpers can be compiled and executed without pulling the
 * fetch layer in.
 */

/** GeoJSON positions are `[longitude, latitude]`, in that order. */
export type GeoJsonPosition = [number, number];

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: GeoJsonPosition[][];
};

/** Spelled exactly as `doc/vision.md:86` names them. Derived server-side, never stored. */
export type LotState = "libre" | "sembrado" | "aplicado" | "cosechado";
