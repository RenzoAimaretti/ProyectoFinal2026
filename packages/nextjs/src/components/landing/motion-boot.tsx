"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __almMotionTimer?: number;
  }
}

/**
 * Signals that React has hydrated the landing and cancels the visibility
 * fallback installed by the inline boot script. If the script never ran, the
 * class is added here instead; the fallback flag is respected so a slow load
 * never re-hides content after it was already shown.
 */
export function MotionBoot() {
  useEffect(() => {
    const body = document.body;
    if (body.dataset.almFallback === "1") return;

    body.classList.add("alm-js");
    body.classList.add("alm-ready");

    if (window.__almMotionTimer) {
      window.clearTimeout(window.__almMotionTimer);
      window.__almMotionTimer = undefined;
    }
  }, []);

  return null;
}
