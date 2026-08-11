import {
  AuthJwtPayload,
  AuthUserCredentials,
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  UpdateSecurityStateInput,
} from './auth.types';

export const USER_CREDENTIALS_REPOSITORY = Symbol('USER_CREDENTIALS_REPOSITORY');
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const TOKEN_SIGNER = Symbol('TOKEN_SIGNER');
export const RANDOM_TOKEN = Symbol('RANDOM_TOKEN');
export const CLOCK = Symbol('CLOCK');

export interface UserCredentialsRepositoryPort {
  findByEmail(email: string): Promise<AuthUserCredentials | null>;
  updateSecurityState(id: string, data: UpdateSecurityStateInput): Promise<void>;
}

export interface RefreshTokenRepositoryPort {
  findActiveWithUsers(): Promise<RefreshTokenRecord[]>;
  findActiveForLogout(): Promise<RefreshTokenRecord[]>;
  create(input: CreateRefreshTokenInput): Promise<void>;
  revoke(id: string, revokedAt: Date): Promise<void>;
}

export interface PasswordHasherPort {
  hash(value: string): Promise<string>;
  verify(value: string, hash: string): Promise<{ valid: boolean; needsRehash: boolean }>;
}

export interface TokenSignerPort {
  signAccessToken(payload: AuthJwtPayload): string;
}

export interface RandomTokenPort {
  generateToken(): string;
}

export interface ClockPort {
  now(): Date;
}
