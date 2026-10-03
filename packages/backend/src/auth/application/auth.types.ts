export const AUTH_USER_ROLES = ['ADMIN', 'OPERARIO', 'SUPERVISOR', 'PRODUCTOR', 'CONTRATISTA', 'VETERINARIO'] as const;
export const REFRESH_TOKEN_EXPIRATION_DAYS = 7;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export type AuthUserRole = (typeof AUTH_USER_ROLES)[number];

export type AuthUserCredentials = {
  id: string;
  email: string;
  passwordHash: string;
  role: AuthUserRole;
  tenantId: string;
  firmaId: string | null;
  active: boolean;
  deleted: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  mustChangePassword?: boolean;
};

export type AuthUserPrincipal = {
  id: string;
  email: string;
  role: AuthUserRole;
  tenantId: string;
  firmaId: string;
  mustChangePassword?: boolean;
};

export type AuthJwtPayload = {
  sub: string;
  role: AuthUserRole;
  tenantId: string;
  firmaId: string;
  email?: string;
  iat?: number;
  exp?: number;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserPrincipal;
};

export type RefreshResult = {
  accessToken: string;
  refreshToken: string;
};

export type LogoutResult = {
  message: string;
};

export type RefreshTokenRecord = {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: AuthUserCredentials;
};

export type CreateRefreshTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type UpdateSecurityStateInput = {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  passwordHash?: string;
  mustChangePassword?: boolean;
};
