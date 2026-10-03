import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DuplicateEntityError } from '../../domain/errors';
import {
  ClientPasswordHasherPort,
  ClientRepositoryPort,
  ClientUserReaderPort,
} from '../../application/client.ports';
import {
  ClientAccessResult,
  ClientFarmRecord,
  ClientProfileRecord,
  ClientRecord,
  CreateClientData,
  CreateClientWithAccessData,
  UpdateClientInput,
  UpdateClientProfileInput,
} from '../../application/client.types';
import * as argon2 from 'argon2';

@Injectable()
export class PrismaClientRepository
  implements ClientRepositoryPort, ClientUserReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenantId(tenantId: string): Promise<ClientRecord[]> {
    return this.prisma.client.findMany({ where: { tenantId } });
  }

  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<ClientRecord | null> {
    return this.prisma.client.findFirst({ where: { id, tenantId } });
  }

  findByNameAndTenantId(
    name: string,
    tenantId: string,
  ): Promise<ClientRecord | null> {
    return this.prisma.client.findFirst({ where: { name, tenantId } });
  }

  findByUserId(userId: string): Promise<ClientRecord | null> {
    return this.prisma.client.findFirst({ where: { userId } });
  }

  findUserByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  async findClientIdByUserId(userId: string): Promise<string | null> {
    const client = await this.prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    });

    return client?.id ?? null;
  }

  create(data: CreateClientData): Promise<ClientRecord> {
    return this.prisma.client.create({ data });
  }

  async createWithAccess(
    data: CreateClientWithAccessData,
  ): Promise<ClientAccessResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: data.email },
          select: { id: true },
        });

        if (existingUser) {
          throw new DuplicateEntityError(
            'A user with this email already exists',
          );
        }

        const client = await tx.client.create({
          data: {
            tenantId: data.tenantId,
            name: `${data.firstName} ${data.lastName}`.trim(),
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            address: data.address,
          },
        });

        const user = await tx.user.create({
          data: {
            tenantId: data.tenantId,
            email: data.email,
            passwordHash: data.passwordHash,
            role: 'PRODUCTOR',
            mustChangePassword: true,
            active: true,
          },
        });

        await tx.userCompany.create({
          data: {
            userId: user.id,
            companyId: data.companyId,
            role: 'PRODUCTOR',
            active: true,
          },
        });

        await tx.client.update({
          where: { id: client.id },
          data: { userId: user.id },
        });

        const surface = data.lots.reduce((total, lot) => total + lot.area, 0);

        const farm = await tx.farm.create({
          data: {
            clientId: client.id,
            name: data.farmName,
            location: '',
            surface,
          },
        });

        const lots = [] as ClientFarmRecord['lots'];
        for (const lot of data.lots) {
          const createdLot = await tx.lot.create({
            data: {
              farmId: farm.id,
              name: lot.name,
              area: lot.area,
              coords: lot.coords ?? null,
            },
          });

          lots.push({
            id: createdLot.id,
            name: createdLot.name,
            area: createdLot.area,
            coords: createdLot.coords,
          });
        }

        const farms: ClientFarmRecord[] = [
          {
            id: farm.id,
            name: farm.name,
            location: farm.location,
            surface: farm.surface,
            lots,
          },
        ];

        return {
          id: client.id,
          name: client.name,
          firstName: client.firstName,
          lastName: client.lastName,
          email: user.email,
          phone: client.phone,
          address: client.address,
          farms,
          lots,
        };
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateEntityError(
          'A user with this email already exists',
        );
      }

      throw error;
    }
  }

  async findProfileByUserId(
    userId: string,
  ): Promise<ClientProfileRecord | null> {
    const client = await this.prisma.client.findFirst({
      where: { userId },
      include: {
        user: { select: { email: true } },
        farms: {
          where: { deleted: false },
          include: { lots: { where: { deleted: false } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!client) {
      return null;
    }

    return {
      id: client.id,
      name: client.name,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.user?.email ?? null,
      phone: client.phone,
      address: client.address,
      farms: client.farms.map((farm) => ({
        id: farm.id,
        name: farm.name,
        location: farm.location,
        surface: farm.surface,
        lots: farm.lots.map((lot) => ({
          id: lot.id,
          name: lot.name,
          area: lot.area,
          coords: lot.coords,
        })),
      })),
    };
  }

  async updateProfileForUserId(
    userId: string,
    data: UpdateClientProfileInput,
  ): Promise<ClientProfileRecord> {
    const client = await this.prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!client) {
      throw new Error(`Client linked to user ${userId} not found`);
    }

    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
      },
    });

    const profile = await this.findProfileByUserId(userId);

    if (!profile) {
      throw new Error(`Client linked to user ${userId} not found`);
    }

    return profile;
  }

  async updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateClientInput,
  ): Promise<ClientRecord> {
    const { count } = await this.prisma.client.updateMany({
      where: { id, tenantId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.cuit !== undefined ? { cuit: data.cuit } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    if (count === 0) {
      throw new Error(`Client with id ${id} not found for tenant ${tenantId}`);
    }

    return this.prisma.client.findFirstOrThrow({ where: { id, tenantId } });
  }
}

@Injectable()
export class ClientPasswordHasher implements ClientPasswordHasherPort {
  hash(value: string): Promise<string> {
    return argon2.hash(value);
  }
}
