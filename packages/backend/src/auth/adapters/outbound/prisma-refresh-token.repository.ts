import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RefreshTokenRepositoryPort } from '../../application/auth.ports';
import { AuthUserCredentials, CreateRefreshTokenInput, RefreshTokenRecord } from '../../application/auth.types';

type RefreshTokenWithUser = {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: {
    id: string;
    email: string;
    passwordHash: string;
    role: AuthUserCredentials['role'];
    tenantId: string;
    active: boolean;
    deleted: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    companyMemberships: { companyId: string }[];
  };
};

function toAuthUserCredentials(user: RefreshTokenWithUser['user']): AuthUserCredentials {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role,
    tenantId: user.tenantId,
    firmaId: user.companyMemberships[0]?.companyId ?? null,
    active: user.active,
    deleted: user.deleted,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil,
  };
}

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveWithUsers(): Promise<RefreshTokenRecord[]> {
    const records = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            companyMemberships: {
              where: { active: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { companyId: true },
            },
          },
        },
      },
    });

    return records
      .filter((record) => Boolean(record.user))
      .map((record) => ({
        id: record.id,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
        user: toAuthUserCredentials(record.user),
      }));
  }

  async findActiveForLogout(): Promise<RefreshTokenRecord[]> {
    const records = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
      },
      include: {
        user: {
          include: {
            companyMemberships: {
              where: { active: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { companyId: true },
            },
          },
        },
      },
    });

    return records
      .filter((record) => Boolean(record.user))
      .map((record) => ({
        id: record.id,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
        user: toAuthUserCredentials(record.user),
      }));
  }

  async create(input: CreateRefreshTokenInput): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt },
    });
  }
}
