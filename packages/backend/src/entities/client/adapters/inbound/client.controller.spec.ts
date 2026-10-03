import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { FindAllClientsUseCase } from '../../application/use-cases/find-all-clients.use-case';
import { FindClientUseCase } from '../../application/use-cases/find-client.use-case';
import { CreateClientWithAccessUseCase } from '../../application/use-cases/create-client-with-access.use-case';
import { FindClientProfileUseCase } from '../../application/use-cases/find-client-profile.use-case';
import { UpdateClientProfileUseCase } from '../../application/use-cases/update-client-profile.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { ClientController } from './client.controller';

const mockClient = {
  id: 'client-1',
  tenantId: 'tenant-1',
  name: 'Estancia La Esperanza',
  cuit: null,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const mockProfile = {
  id: 'client-1',
  name: 'Juan Perez',
  firstName: 'Juan',
  lastName: 'Perez',
  email: 'juan@campo.com',
  phone: '123',
  address: 'Ruta 1',
  farms: [],
};

const req = {
  user: { id: 'user-1', tenantId: 'tenant-1', firmaId: 'company-1', role: 'ADMIN' },
};

describe('ClientController', () => {
  let controller: ClientController;
  let findAllClients: jest.Mocked<FindAllClientsUseCase>;
  let findClient: jest.Mocked<FindClientUseCase>;
  let createClientWithAccess: jest.Mocked<CreateClientWithAccessUseCase>;
  let findClientProfile: jest.Mocked<FindClientProfileUseCase>;
  let updateClientProfile: jest.Mocked<UpdateClientProfileUseCase>;

  beforeEach(() => {
    findAllClients = { execute: jest.fn() } as unknown as jest.Mocked<FindAllClientsUseCase>;
    findClient = { execute: jest.fn() } as unknown as jest.Mocked<FindClientUseCase>;
    createClientWithAccess = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateClientWithAccessUseCase>;
    findClientProfile = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindClientProfileUseCase>;
    updateClientProfile = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateClientProfileUseCase>;

    controller = new ClientController(
      findAllClients,
      findClient,
      createClientWithAccess,
      findClientProfile,
      updateClientProfile,
    );
  });

  it('protects every route with JwtAuthGuard and RolesGuard', () => {
    for (const method of ['findAll', 'findMe', 'updateMe', 'findOne', 'create'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        ClientController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    }
  });

  it('delegates tenant-scoped admin reads', async () => {
    findAllClients.execute.mockResolvedValue([mockClient]);
    findClient.execute.mockResolvedValue(mockClient);

    await expect(controller.findAll(req as never)).resolves.toEqual([mockClient]);
    await expect(controller.findOne('client-1', req as never)).resolves.toEqual(
      mockClient,
    );

    expect(findAllClients.execute).toHaveBeenCalledWith('tenant-1');
    expect(findClient.execute).toHaveBeenCalledWith('client-1', 'tenant-1');
  });

  it('creates a client bundle with the authenticated tenant and firma', async () => {
    createClientWithAccess.execute.mockResolvedValue({
      id: 'client-2',
      name: 'Juan Perez',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan@campo.com',
      phone: null,
      address: null,
      farms: [],
      lots: [],
      password: 'Cliente2026!',
    });

    await expect(
      controller.create(req as never, {
        email: 'juan@campo.com',
        firstName: 'Juan',
        lastName: 'Perez',
        farmName: 'El Ombu',
        lots: [{ name: 'Lote 1', area: 10 }],
      }),
    ).resolves.toMatchObject({ id: 'client-2', password: 'Cliente2026!' });

    expect(createClientWithAccess.execute).toHaveBeenCalledWith(
      'tenant-1',
      'company-1',
      expect.objectContaining({ email: 'juan@campo.com' }),
    );
  });

  it('resolves the self profile and updates it by user id', async () => {
    findClientProfile.execute.mockResolvedValue(mockProfile);
    updateClientProfile.execute.mockResolvedValue({ ...mockProfile, phone: '999' });

    await expect(controller.findMe(req as never)).resolves.toEqual(mockProfile);
    await expect(
      controller.updateMe(req as never, { phone: '999' }),
    ).resolves.toEqual({ ...mockProfile, phone: '999' });

    expect(findClientProfile.execute).toHaveBeenCalledWith('user-1');
    expect(updateClientProfile.execute).toHaveBeenCalledWith('user-1', {
      phone: '999',
    });
  });

  it('maps domain errors to HTTP exceptions', async () => {
    findClient.execute.mockRejectedValue(
      new EntityNotFoundError('Client with id client-9 not found'),
    );
    await expect(controller.findOne('client-9', req as never)).rejects.toThrow(
      NotFoundException,
    );

    findAllClients.execute.mockRejectedValue(
      new InvalidInputError('tenantId is required'),
    );
    await expect(controller.findAll(req as never)).rejects.toThrow(
      BadRequestException,
    );

    createClientWithAccess.execute.mockRejectedValue(
      new DuplicateEntityError('A user with this email already exists'),
    );
    await expect(
      controller.create(req as never, {} as never),
    ).rejects.toThrow(ConflictException);
  });
});
