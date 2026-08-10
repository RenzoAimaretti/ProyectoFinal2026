import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UserRole } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
type CreateUserInput = {
  companyId: string;
  username?: string;
  email?: string;
  password: string;
  role: UserRole;
  active?: boolean;
};
type UpdateUserInput = {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  active?: boolean;
};

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.user.findMany();
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error fetching user:', error);
      throw new InternalServerErrorException('Error fetching user');
    }
  }

  async create(data: CreateUserInput) {
    this.assertRequiredString(data.companyId, 'companyId');
    const userEmail = data.email ?? data.username;
    if (!userEmail || typeof userEmail !== 'string' || userEmail.trim().length === 0) {
      throw new BadRequestException('email or username is required');
    }
    this.assertRequiredString(data.password, 'password');
    this.assertValidRole(data.role);

    try {
      const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });

      if (!company) {
        throw new NotFoundException(`Company with id ${data.companyId} not found`);
      }

      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (existingByEmail) {
        throw new ConflictException('User with this email already exists');
      }

      if (data.username) {
        const existingByUsername = await this.prisma.user.findUnique({
          where: { username: data.username },
        });

        if (existingByUsername) {
          throw new ConflictException('User with this username already exists');
        }
      }

      const passwordHash = await argon2.hash(data.password);

      return await this.prisma.user.create({
        data: {
          companyId: data.companyId,
          email: userEmail,
          ...(data.username ? { username: data.username } : {}),
          passwordHash: passwordHash,
          role: data.role,
          active: data.active ?? true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A user with this username or email already exists');
      }

      console.error('Error creating user:', error);
      throw new InternalServerErrorException('Error creating user');
    }
  }

  async update(id: string, data: UpdateUserInput) {
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      if (data.username !== undefined) {
        this.assertRequiredString(data.username, 'username');

        const existingUser = await this.prisma.user.findUnique({
          where: { username: data.username },
        });

        if (existingUser && existingUser.id !== id) {
          throw new ConflictException('User with this username already exists');
        }
      }

      if (data.role !== undefined) {
        this.assertValidRole(data.role);
      }

      const hashedPassword = data.password !== undefined ? await argon2.hash(data.password) : undefined;

      return await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.username !== undefined ? { username: data.username } : {}),
          ...(hashedPassword !== undefined ? { passwordHash: hashedPassword } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      console.error('Error updating user:', error);
      throw new InternalServerErrorException('Error updating user');
    }
  }

  private assertRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }
  }

  private assertValidRole(role: unknown) {
    if (typeof role !== 'string' || !Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException(`role must be one of: ${Object.values(UserRole).join(', ')}`);
    }
  }
  //Revisar si hacemos el manejo del login aca o en otro servicio
}
