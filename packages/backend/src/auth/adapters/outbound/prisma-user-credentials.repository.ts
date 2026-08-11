import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserCredentialsRepositoryPort } from '../../application/auth.ports';
import { AuthUserCredentials, UpdateSecurityStateInput } from '../../application/auth.types';

@Injectable()
export class PrismaUserCredentialsRepository implements UserCredentialsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUserCredentials | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user as AuthUserCredentials | null;
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
