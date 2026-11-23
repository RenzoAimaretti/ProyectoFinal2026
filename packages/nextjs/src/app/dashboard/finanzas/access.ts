/**
 * Tab-level access rules of the Finanzas section. They only decide what the UI
 * shows: the backend enforces every endpoint with `@Roles`, so hiding a tab is
 * never a substitute for authorization. Kept free of runtime imports so
 * `node --test` can load it (the role helpers in `nav.ts` pull in JSX).
 */

export type FinanceTabId = "tarifario";

/** Tarifario (tariffs) is ADMIN-only. SUPERVISOR never sees it. */
export function canSeeTariffs(role?: string | null): boolean {
  return role === "ADMIN";
}

/** Tabs the role may see, in display order. Unknown roles see none (fail closed). */
export function visibleFinanceTabs(role?: string | null): FinanceTabId[] {
  const tabs: FinanceTabId[] = [];
  if (canSeeTariffs(role)) tabs.push("tarifario");
  return tabs;
}

export function defaultFinanceTab(role?: string | null): FinanceTabId | null {
  return visibleFinanceTabs(role)[0] ?? null;
}
