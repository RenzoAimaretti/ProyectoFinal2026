"use client";

// Client-only Leaflet map (vanilla — deliberately NOT react-leaflet, to avoid
// the React 19 peer surface). Leaflet touches `window`/`document` at import
// time, so this module is loaded exclusively through next/dynamic with
// `{ ssr: false }` and defers every Leaflet call to `useEffect`.
//
// Layers: OpenStreetMap base + the RainViewer radar overlay built from the
// backend-provided `tileTemplate` (tiles are fetched straight from the CDN, the
// backend never proxies them) + a wind layer holding the knot vector marker.

import { useEffect, useRef } from "react";
import type { Map as LeafletMapInstance } from "leaflet";
import type { WeatherResponse } from "@/api/client";
import "leaflet/dist/leaflet.css";

/**
 * A single wind arrow, rotated toward the direction the wind is blowing *to*
 * (`windDirectionDeg` is meteorological: the direction it blows *from*).
 */
function windArrowHtml(blowingToDeg: number): string {
  return `<svg width="38" height="38" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--op-signal, #a8381d); transform: rotate(${blowingToDeg}deg);">
    <path d="M12 20V4" />
    <path d="M12 4l-5 5" />
    <path d="M12 4l5 5" />
  </svg>`;
}

export type LeafletMapProps = {
  weather: WeatherResponse;
  className?: string;
};

export default function LeafletMap({ weather, className = "" }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { lat, lon } = weather.location;
  const { windSpeedKnots, windDirectionDeg } = weather.current;
  const tileTemplate = weather.radar?.tileTemplate ?? null;

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMapInstance | null = null;

    void (async () => {
      const L = await import("leaflet");
      const container = containerRef.current;
      // The effect may have been cleaned up (or the node unmounted) while the
      // async import was in flight.
      if (cancelled || !container) return;

      map = L.map(container, { scrollWheelZoom: false }).setView([lat, lon], 9);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      if (tileTemplate) {
        L.tileLayer(tileTemplate, {
          opacity: 0.6,
          attribution: "RainViewer",
        }).addTo(map);
      }

      const windLayer = L.layerGroup();
      const windMarker = L.marker([lat, lon], {
        icon: L.divIcon({
          className: "agro-wind-marker",
          html: windArrowHtml((windDirectionDeg + 180) % 360),
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        }),
      });
      windMarker.bindTooltip(`${windSpeedKnots} kn · ${windDirectionDeg}°`, { direction: "top" });
      windMarker.addTo(windLayer);
      windLayer.addTo(map);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lon, tileTemplate, windSpeedKnots, windDirectionDeg]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={`Mapa con la capa de viento (${windSpeedKnots} nudos) y el radar de lluvia sobre ${lat.toFixed(2)}, ${lon.toFixed(2)}`}
    />
  );
}
