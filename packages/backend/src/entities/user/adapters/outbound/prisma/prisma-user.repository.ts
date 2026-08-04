import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { UserRole as PrismaUserRole } from '../../../../../../prisma/generated/client';
import { UserRole } from '../../../domain/user-role';
import {
  CreateUserData,
  UpdateUserData,
  UserEntity,
  UserRepositoryPort,
} from '../../../ports/user.repository';

// Mapeo explícito generado ↔ dominio (REQ-A-04): el enum generado por Prisma es un
// const object; la copia de dominio es un enum TS con miembros idénticos. Este es
// el ÚNICO archivo del módulo user que importa prisma/generated (REQ-A-04) y el
// que absorbe el import legacy de @prisma/client/runtime/client (design.md línea 146).
const PRISMA_ROLE_TO_DOMAIN: Record<PrismaUserRole, UserRole> = {
  ADMIN: UserRole.ADMIN,
  OPERARIO: UserRole.OPERARIO,
  PRODUCTOR: UserRole.PRODUCTOR,
  CONTRATISTA: UserRole.CONTRATISTA,
  VETERINARIO: UserRole.VETERINARIO,
};

const DOMAIN_ROLE_TO_PRISMA: Record<UserRole, PrismaUserRole> = {
  [UserRole.ADMIN]: 'ADMIN',
  [UserRole.OPERARIO]: 'OPERARIO',
  [UserRole.PRODUCTOR]: 'PRODUCTOR',
  [UserRole.CONTRATISTA]: 'CONTRATISTA',
  [UserRole.VETERINARIO]: 'VETERINARIO',
};

// Fila escalar de Prisma (role en el enum generado) — base del mapeo a entidad.
type UserRow = Omit<UserEntity, 'role'> & { role: PrismaUserRole };

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserEntity[]> {
    const rows = await this.prisma.user.findMany();
    return rows.map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toEntity(row) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { username } });
    return row ? this.toEntity(row) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    try {
      const row = await this.prisma.user.create({
        data: {
          companyId: data.companyId,
          email: data.email,
          ...(data.username ? { username: data.username } : {}),
          passwordHash: data.passwordHash,
          role: DOMAIN_ROLE_TO_PRISMA[data.role],
          active: data.active ?? true,
        },
      });
      return this.toEntity(row);
    } catch (error) {
      // P2002 en create = carrera entre la validación del service y el INSERT
      // (comportamiento legacy preservado: user.service.ts línea 102).
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A user with this username or email already exists',
        );
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    const row = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.username !== undefined ? { username: data.username } : {}),
        ...(data.passwordHash !== undefined
          ? { passwordHash: data.passwordHash }
          : {}),
        ...(data.role !== undefined
          ? { role: DOMAIN_ROLE_TO_PRISMA[data.role] }
          : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
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
