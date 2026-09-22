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

export interface UserRepositoryPort {
  findAll(): Promise<UserRecord[]>;
  findAllByCompanyId(companyId: string): Promise<UserRecord[]>;
  findById(id: string): Promise<UserRecord | null>;
  findByIdForCompany(id: string, companyId: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  create(data: CreateUserData): Promise<UserRecord>;
  update(id: string, data: UpdateUserData): Promise<UserRecord>;
  updateForCompany(id: string, companyId: string, data: UpdateUserData): Promise<UserRecord>;
}

export interface TenantReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export type { CreateUserInput, UpdateUserInput, UserRecord, UserRoleValue };
