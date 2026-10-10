"use client";

import { createContext, useContext } from "react";

/**
 * Active visual world for portal-based overlays.
 *
 * `createPortal` preserves the React context chain even though the DOM node is
 * mounted elsewhere (document.body). Overlays read this value and stamp the
 * active world class onto their portal root so the world's scoped tokens and
 * descendant selectors (`.operate-world …`) reach the drawer/modal.
 *
 * The default "" is deliberate: surfaces outside the dashboard (landing's
 * `.almanac-world`, /demo, /login, /onboarding) provide no value, so their
 * overlays keep the incumbent behavior and never inherit the world.
 */
const WorldContext = createContext("");

export function WorldProvider({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

/** Returns the active world class name, or "" when none is provided. */
export function useWorldClassName(): string {
  return useContext(WorldContext);
}
