import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserCredentialsRepositoryPort } from '../../application/auth.ports';
import { AuthUserCredentials, UpdateSecurityStateInput } from '../../application/auth.types';

type UserWithMemberships = {
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

export function toAuthUserCredentials(user: UserWithMemberships): AuthUserCredentials {
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
export class PrismaUserCredentialsRepository implements UserCredentialsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUserCredentials | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        companyMemberships: {
          where: { active: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { companyId: true },
        },
      },
    });

    return user ? toAuthUserCredentials(user) : null;
  }

  async updateSecurityState(id: string, data: UpdateSecurityStateInput): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: data.failedLoginAttempts,
        lockedUntil: data.lockedUntil,
        ...(data.passwordHash ? { passwordHash: data.passwordHash } : {}),
      },
    });
  }
}
