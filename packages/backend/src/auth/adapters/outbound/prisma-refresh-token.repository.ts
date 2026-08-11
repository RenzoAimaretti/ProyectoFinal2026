import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RefreshTokenRepositoryPort } from '../../application/auth.ports';
import { AuthUserCredentials, CreateRefreshTokenInput, RefreshTokenRecord } from '../../application/auth.types';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveWithUsers(): Promise<RefreshTokenRecord[]> {
    const records = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    return records
      .filter((record) => Boolean(record.user))
      .map((record) => ({
        id: record.id,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
        user: record.user as AuthUserCredentials,
      }));
  }

  async findActiveForLogout(): Promise<RefreshTokenRecord[]> {
    const records = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
      },
      include: { user: true },
    });

    return records
      .filter((record) => Boolean(record.user))
      .map((record) => ({
        id: record.id,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
        user: record.user as AuthUserCredentials,
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
