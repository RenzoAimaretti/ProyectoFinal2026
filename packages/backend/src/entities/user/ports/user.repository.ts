import { UserRole } from '../domain/user-role';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// Entidad de aplicación: fila completa de User, byte-idéntica a lo que hoy
// devuelve Prisma (REQ-F2-02, D4/REQ-A-02). Sin relaciones.
export type UserEntity = {
  id: string;
  companyId: string;
  username: string | null;
  email: string;
  passwordHash: string;
  role: UserRole;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

// El service hashea el password (argon2) ANTES de llamar al puerto: el contrato
// de persistencia recibe passwordHash (T-F2-26; el import legacy de
// @prisma/client/runtime/client queda SOLO en el adapter, REQ-F0-03).
export type CreateUserData = {
  companyId: string;
  username?: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active?: boolean;
};

// Sin email: el update de hoy NUNCA escribe email (se descarta en user.service,
// comportamiento byte-idéntico preservado — REQ-C-01/03).
export type UpdateUserData = {
  username?: string;
  passwordHash?: string;
  role?: UserRole;
  active?: boolean;
};

export interface UserRepositoryPort {
  findAll(): Promise<UserEntity[]>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(id: string, data: UpdateUserData): Promise<UserEntity>;
}
