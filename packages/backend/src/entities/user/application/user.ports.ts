import {
  CreateUserData,
  CreateUserInput,
  UpdateUserData,
  UpdateUserInput,
  UserRecord,
  UserRoleValue,
} from './user.types';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const COMPANY_READER = Symbol('USER_COMPANY_READER');

export interface UserRepositoryPort {
  findAll(): Promise<UserRecord[]>;
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  create(data: CreateUserData): Promise<UserRecord>;
  update(id: string, data: UpdateUserData): Promise<UserRecord>;
}

export interface CompanyReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export type { CreateUserInput, UpdateUserInput, UserRecord, UserRoleValue };
