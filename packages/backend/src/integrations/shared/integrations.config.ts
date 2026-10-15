/**
 * Reads the outbound HTTP timeout from the environment and fails loudly on an
 * invalid value, instead of silently falling back to a default.
 */
export function readExternalHttpTimeoutMs(): number {
  const raw = process.env.EXTERNAL_HTTP_TIMEOUT_MS;

  if (raw === undefined || raw.trim() === '') {
    return 8000;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('EXTERNAL_HTTP_TIMEOUT_MS must be a positive number.');
  }

  return parsed;
}
