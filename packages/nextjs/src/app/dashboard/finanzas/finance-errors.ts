import { ApiError } from "@/api/client";

/** D25: shown when a USD or kilos expense cannot be valued right now. */
export const MARKET_UNAVAILABLE_NOTICE =
  "El precio de mercado no está disponible. Reintentá en unos minutos o cargá el gasto en ARS.";

/**
 * Message for an API failure of the Gastos, Categorías and Sugerencias tabs.
 * Business errors (400, 404, 409) keep the server's own message; 503 means the
 * market price is unavailable.
 */
export function describeFinanceError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    if (err.status === 403) return "No tenés permisos para realizar esta acción.";
    if (err.status === 503) return MARKET_UNAVAILABLE_NOTICE;
    if (err.status === 400 || err.status === 404 || err.status === 409) {
      const body = err.body as { message?: unknown } | null;
      if (body && typeof body.message === "string") return body.message;
      if (body && Array.isArray(body.message) && typeof body.message[0] === "string") {
        return body.message[0];
      }
    }
    return `${fallback} (código ${err.status}).`;
  }
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

export function isConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}
