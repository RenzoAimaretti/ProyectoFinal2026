/**
 * Reads the JWT signing secret from the environment and fails loudly when it is
 * missing, instead of silently falling back to a hardcoded secret.
 */
export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET is not set. Define it in the environment before starting.',
    );
  }

  return secret;
}
