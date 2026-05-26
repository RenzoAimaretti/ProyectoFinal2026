import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
type CreateUserInput = {
  companyId: string;
  username: string;
  password: string;
  role: UserRole;
  active?: boolean;
};
type UpdateUserInput = {
  username?: string;
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
    this.assertRequiredString(data.username, 'username');
    this.assertRequiredString(data.password, 'password');
    this.assertValidRole(data.role);

    try {
      const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });

      if (!company) {
        throw new NotFoundException(`Company with id ${data.companyId} not found`);
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existingUser) {
        throw new ConflictException('User with this username already exists');
      }
      // Hasheo del password usando bcrypt
      const passwordHash = await bcrypt.hash(data.password, 10);



      return await this.prisma.user.create({
        data: {
          companyId: data.companyId,
          username: data.username,
          passwordHash: passwordHash,
          role: data.role,
          active: data.active ?? true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
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

      const hashedPassword = data.password !== undefined ? await bcrypt.hash(data.password, 10) : undefined;

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
