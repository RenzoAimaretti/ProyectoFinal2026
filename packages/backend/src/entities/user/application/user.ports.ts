import {
  CreateUserData,
  CreateUserInput,
  UpdateUserData,
  UpdateUserInput,
  UserRecord,
  UserRoleValue,
} from './user.types';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const TENANT_READER = Symbol('USER_TENANT_READER');
export const COMPANY_READER = Symbol('USER_COMPANY_READER');
export const PASSWORD_HASHER = Symbol('USER_PASSWORD_HASHER');

export interface UserRepositoryPort {
  findAll(): Promise<UserRecord[]>;
  findAllByTenantId(tenantId: string): Promise<UserRecord[]>;
  findById(id: string): Promise<UserRecord | null>;
  findByIdForTenant(id: string, tenantId: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  create(data: CreateUserData): Promise<UserRecord>;
  update(id: string, data: UpdateUserData): Promise<UserRecord>;
  updateForTenant(id: string, tenantId: string, data: UpdateUserData): Promise<UserRecord>;
}

export interface TenantReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface CompanyReaderPort {
  findByIdForTenant(id: string, tenantId: string): Promise<{ id: string } | null>;
}

export interface PasswordHasherPort {
  hash(value: string): Promise<string>;
}

export type { CreateUserInput, UpdateUserInput, UserRecord, UserRoleValue };
