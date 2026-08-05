import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserRole as PrismaUserRole } from '../../../../../prisma/generated/client';
import { UserRole } from '../../../../entities/user/domain/user-role';
import { UserEntity } from '../../../../entities/user/ports/user.repository';
import {
  UpdateUserCredentialsData,
  UserCredentialsRepositoryPort,
} from '../../../ports/user-credentials.repository';

// T-F3-03 — adapter de credenciales (REQ-A-04): único lugar del auth que toca
// prisma/generated para credenciales. Mapeo explícito generado ↔ dominio
// (mismo patrón que prisma-user.repository.ts del módulo user).
const PRISMA_ROLE_TO_DOMAIN: Record<PrismaUserRole, UserRole> = {
  ADMIN: UserRole.ADMIN,
  OPERARIO: UserRole.OPERARIO,
  PRODUCTOR: UserRole.PRODUCTOR,
  CONTRATISTA: UserRole.CONTRATISTA,
  VETERINARIO: UserRole.VETERINARIO,
};

// Fila escalar de Prisma (role en el enum generado) — base del mapeo a entidad.
type UserRow = Omit<UserEntity, 'role'> & { role: PrismaUserRole };

@Injectable()
export class PrismaUserCredentialsRepository implements UserCredentialsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toEntity(row) : null;
  }

  async update(
    id: string,
    data: UpdateUserCredentialsData,
  ): Promise<UserEntity> {
    const row = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.passwordHash !== undefined
          ? { passwordHash: data.passwordHash }
          : {}),
        ...(data.failedLoginAttempts !== undefined
          ? { failedLoginAttempts: data.failedLoginAttempts }
          : {}),
        // lockedUntil siempre se escribe (null o Date) — byte-idéntico al
        // legacy (auth.service.ts líneas 92-98 / 107-114).
        ...(data.lockedUntil !== undefined
          ? { lockedUntil: data.lockedUntil }
          : {}),
      },
    });
    return this.toEntity(row);
  }

  private toEntity(row: UserRow): UserEntity {
    return {
      id: row.id,
      companyId: row.companyId,
      username: row.username,
      email: row.email,
      passwordHash: row.passwordHash,
      role: PRISMA_ROLE_TO_DOMAIN[row.role],
      failedLoginAttempts: row.failedLoginAttempts,
      lockedUntil: row.lockedUntil,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
      deleted: row.deleted,
    };
  }
}
