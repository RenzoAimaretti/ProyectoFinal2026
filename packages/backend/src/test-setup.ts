// Unit tests do not load a .env file, so provide a non-production placeholder
// for secrets that code requires. This is a test value, never a real secret.
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'unit-test-jwt-secret-placeholder';
