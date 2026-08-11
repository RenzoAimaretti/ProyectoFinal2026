import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DuplicateEntityError } from '../../domain/errors';
import { CreateUserData, UpdateUserData, UserRecord } from '../../application/user.types';
import { UserRepositoryPort } from '../../application/user.ports';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<UserRecord[]> {
    return this.prisma.user.findMany() as unknown as Promise<UserRecord[]>;
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } }) as unknown as Promise<UserRecord | null>;
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } }) as unknown as Promise<UserRecord | null>;
  }

  findByUsername(username: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { username } }) as unknown as Promise<
      UserRecord | null
    >;
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    try {
      return (await this.prisma.user.create({
        data: {
          companyId: data.companyId,
          email: data.email,
          ...(data.username ? { username: data.username } : {}),
          passwordHash: data.passwordHash,
          role: data.role,
          active: data.active,
        },
      })) as UserRecord;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateEntityError('A user with this username or email already exists');
      }

      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<UserRecord> {
    try {
      return (await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.username !== undefined ? { username: data.username } : {}),
          ...(data.passwordHash !== undefined ? { passwordHash: data.passwordHash } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
        },
      })) as UserRecord;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateEntityError('User with this username already exists');
      }

      throw error;
    }
  }
}
