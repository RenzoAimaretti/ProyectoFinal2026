import { ApiError } from "./client";

/** Extracts Nest's domain message rather than ApiError's HTTP diagnostic. */
export function catalogErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === "string" && message.trim()) return message.trim();
    }
  }
  return "No se pudo completar la operación. Intentá de nuevo.";
}
