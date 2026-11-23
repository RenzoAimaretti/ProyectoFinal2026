/**
 * Tab-level access rules of the Finanzas section. They only decide what the UI
 * shows: the backend enforces every endpoint with `@Roles`, so hiding a tab or a
 * button is never a substitute for authorization. Kept free of runtime imports so
 * `node --test` can load it (the role helpers in `nav.ts` pull in JSX).
 */

export type FinanceTabId = "tarifario" | "gastos" | "categorias" | "sugerencias";

/** Tarifario (tariffs) is ADMIN-only. SUPERVISOR never sees it. */
export function canSeeTariffs(role?: string | null): boolean {
  return role === "ADMIN";
}

/** Gastos and Categorías: ADMIN and SUPERVISOR. */
export function canManageExpenses(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPERVISOR";
}

/**
 * Sugerencias: the ADMIN sees the inbox of the company, the SUPERVISOR only
 * their own suggestions (the backend filters by author).
 */
export function canSeeSuggestions(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPERVISOR";
}

/** Only the ADMIN approves or rejects a suggestion. */
export function canResolveSuggestions(role?: string | null): boolean {
  return role === "ADMIN";
}

/** Tabs the role may see, in display order. Unknown roles see none (fail closed). */
export function visibleFinanceTabs(role?: string | null): FinanceTabId[] {
  const tabs: FinanceTabId[] = [];
  if (canSeeTariffs(role)) tabs.push("tarifario");
  if (canManageExpenses(role)) tabs.push("gastos", "categorias");
  if (canSeeSuggestions(role)) tabs.push("sugerencias");
  return tabs;
}

export function defaultFinanceTab(role?: string | null): FinanceTabId | null {
  return visibleFinanceTabs(role)[0] ?? null;
}

export type ExpenseActions = {
  /** Direct edit (ADMIN). */
  edit: boolean;
  /** Direct removal (ADMIN). */
  remove: boolean;
  /** Propose an edit (SUPERVISOR). */
  suggestEdit: boolean;
  /** Propose a removal (SUPERVISOR). */
  suggestRemove: boolean;
};

/**
 * Actions offered on an expense row. The ADMIN acts directly and the
 * SUPERVISOR can only suggest; while a suggestion is pending nobody can touch
 * the expense (it must be resolved first).
 */
export function expenseActions(role: string | null | undefined, hasPendingSuggestion: boolean): ExpenseActions {
  const free = !hasPendingSuggestion;
  return {
    edit: role === "ADMIN" && free,
    remove: role === "ADMIN" && free,
    suggestEdit: role === "SUPERVISOR" && free,
    suggestRemove: role === "SUPERVISOR" && free,
  };
}
