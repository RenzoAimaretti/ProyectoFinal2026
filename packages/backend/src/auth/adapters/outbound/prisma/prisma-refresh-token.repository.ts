import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserRole as PrismaUserRole } from '../../../../../prisma/generated/client';
import { UserRole } from '../../../../entities/user/domain/user-role';
import { UserEntity } from '../../../../entities/user/ports/user.repository';
import {
  CreateRefreshTokenData,
  RefreshTokenRecord,
  RefreshTokenRepositoryPort,
  RefreshTokenWithUser,
} from '../../../ports/refresh-token.repository';

// T-F3-03 — adapter de refresh tokens (REQ-A-04): único lugar del auth que toca
// prisma/generated para refresh tokens. Escaneos O(n) byte-idénticos al legacy
// (REQ-F3-03): findActiveWithUser = findMany con expiresAt > now + include
// user; findAllActive = findMany con SOLO revokedAt: null (sin expiración ni
// user — auth.service.ts líneas 165-171 / 236-240).
const PRISMA_ROLE_TO_DOMAIN: Record<PrismaUserRole, UserRole> = {
  ADMIN: UserRole.ADMIN,
  OPERARIO: UserRole.OPERARIO,
  PRODUCTOR: UserRole.PRODUCTOR,
  CONTRATISTA: UserRole.CONTRATISTA,
  VETERINARIO: UserRole.VETERINARIO,
};

type UserRow = Omit<UserEntity, 'role'> & { role: PrismaUserRole };

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord> {
    const row = await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
    return this.toRecord(row);
  }

  async findActiveWithUser(): Promise<RefreshTokenWithUser[]> {
    const rows = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    return rows.map((row) => ({
      ...this.toRecord(row),
      user: this.toUserEntity(row.user),
    }));
  }

  async findAllActive(): Promise<RefreshTokenRecord[]> {
    const rows = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
      },
    });
    return rows.map((row) => this.toRecord(row));
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  private toRecord(row: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
  }): RefreshTokenRecord {
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
    };
  }

  private toUserEntity(row: UserRow): UserEntity {
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
