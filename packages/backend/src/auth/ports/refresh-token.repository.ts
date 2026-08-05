import { UserEntity } from '../../entities/user/ports/user.repository';

// T-F3-02 — port de refresh tokens para auth (REQ-F3-02). Escaneos O(n) con
// firma diferenciada porque el legacy usa DOS findMany distintos (REQ-F3-03,
// byte-idéntico): refreshTokens filtra expiración + include user; logout NO
// filtra expiración y NO incluye user (auth.service.ts líneas 165-171 / 236-240).
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

export type RefreshTokenWithUser = RefreshTokenRecord & {
  user: UserEntity;
};

export type CreateRefreshTokenData = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface RefreshTokenRepositoryPort {
  create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord>;
  // Refresh: scan O(n) de TODOS los tokens activos NO expirados, con su user
  // (findMany con revokedAt: null + expiresAt > now + include user).
  findActiveWithUser(): Promise<RefreshTokenWithUser[]>;
  // Logout: scan O(n) de TODOS los tokens NO revocados, sin filtro de
  // expiración y sin include user (findMany con solo revokedAt: null).
  findAllActive(): Promise<RefreshTokenRecord[]>;
  revoke(id: string): Promise<void>;
}
