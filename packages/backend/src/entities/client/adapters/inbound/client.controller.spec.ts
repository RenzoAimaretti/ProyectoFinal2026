import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { FindAllClientsUseCase } from '../../application/use-cases/find-all-clients.use-case';
import { FindClientUseCase } from '../../application/use-cases/find-client.use-case';
import {
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

const req = { user: { tenantId: 'tenant-1' } };

describe('ClientController', () => {
  let controller: ClientController;
  let findAllClients: jest.Mocked<FindAllClientsUseCase>;
  let findClient: jest.Mocked<FindClientUseCase>;

  beforeEach(() => {
    findAllClients = { execute: jest.fn() } as unknown as jest.Mocked<FindAllClientsUseCase>;
    findClient = { execute: jest.fn() } as unknown as jest.Mocked<FindClientUseCase>;

    controller = new ClientController(findAllClients, findClient);
  });

  it('protects every route with JwtAuthGuard', () => {
    for (const method of ['findAll', 'findOne'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        ClientController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped reads', async () => {
    findAllClients.execute.mockResolvedValue([mockClient]);
    findClient.execute.mockResolvedValue(mockClient);

    await expect(controller.findAll(req as never)).resolves.toEqual([
      mockClient,
    ]);
    await expect(controller.findOne('client-1', req as never)).resolves.toEqual(
      mockClient,
    );

    expect(findAllClients.execute).toHaveBeenCalledWith('tenant-1');
    expect(findClient.execute).toHaveBeenCalledWith('client-1', 'tenant-1');
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
  });
});
