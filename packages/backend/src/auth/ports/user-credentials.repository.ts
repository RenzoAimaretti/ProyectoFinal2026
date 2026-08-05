import { UserEntity } from '../../entities/user/ports/user.repository';

// T-F3-02 — port de credenciales de usuario para auth (REQ-F3-02): el auth
// service SOLO necesita leer credenciales por email y actualizar el estado de
// intentos/lockout/hash. La entidad es la UserEntity canónica del módulo user
// (REQ-A-02) — sin duplicar tipos en auth.
export const USER_CREDENTIALS_REPOSITORY = Symbol(
  'USER_CREDENTIALS_REPOSITORY',
);

// El service hashea la contraseña (argon2/bcrypt) ANTES de persistir: el
// contrato recibe passwordHash. lockedUntil siempre se escribe (null o Date) —
// byte-idéntico al update del legacy (auth.service.ts líneas 92-98 / 107-114).
export type UpdateUserCredentialsData = {
  passwordHash?: string;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
};

export interface UserCredentialsRepositoryPort {
  findByEmail(email: string): Promise<UserEntity | null>;
  update(id: string, data: UpdateUserCredentialsData): Promise<UserEntity>;
}
