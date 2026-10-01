import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { CreateInputUseCase } from '../../application/use-cases/create-input.use-case';
import { FindAllInputsUseCase } from '../../application/use-cases/find-all-inputs.use-case';
import { FindInputUseCase } from '../../application/use-cases/find-input.use-case';
import { UpdateInputUseCase } from '../../application/use-cases/update-input.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { InputController } from './input.controller';

const mockInput = {
  id: 'input-1',
  tenantId: 'tenant-1',
  name: 'Glifosato',
  unit: 'L',
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const req = { user: { tenantId: 'tenant-1' } };

describe('InputController', () => {
  let controller: InputController;
  let findAllInputs: jest.Mocked<FindAllInputsUseCase>;
  let findInput: jest.Mocked<FindInputUseCase>;
  let createInput: jest.Mocked<CreateInputUseCase>;
  let updateInput: jest.Mocked<UpdateInputUseCase>;

  beforeEach(() => {
    findAllInputs = { execute: jest.fn() } as unknown as jest.Mocked<FindAllInputsUseCase>;
    findInput = { execute: jest.fn() } as unknown as jest.Mocked<FindInputUseCase>;
    createInput = { execute: jest.fn() } as unknown as jest.Mocked<CreateInputUseCase>;
    updateInput = { execute: jest.fn() } as unknown as jest.Mocked<UpdateInputUseCase>;

    controller = new InputController(
      findAllInputs,
      findInput,
      createInput,
      updateInput,
    );
  });

  it('protects every route with JwtAuthGuard', () => {
    for (const method of ['findAll', 'findOne', 'create', 'update'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        InputController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped reads and writes', async () => {
    findAllInputs.execute.mockResolvedValue([mockInput]);
    findInput.execute.mockResolvedValue(mockInput);
    createInput.execute.mockResolvedValue(mockInput);
    updateInput.execute.mockResolvedValue({ ...mockInput, name: 'Atrazina' });

    await expect(controller.findAll(req as never)).resolves.toEqual([mockInput]);
    await expect(controller.findOne('input-1', req as never)).resolves.toEqual(
      mockInput,
    );
    await expect(
      controller.create(req as never, { name: 'Glifosato', unit: 'L' }),
    ).resolves.toEqual(mockInput);
    await expect(
      controller.update('input-1', req as never, { name: 'Atrazina' }),
    ).resolves.toEqual({ ...mockInput, name: 'Atrazina' });

    expect(findAllInputs.execute).toHaveBeenCalledWith('tenant-1');
    expect(findInput.execute).toHaveBeenCalledWith('input-1', 'tenant-1');
    expect(createInput.execute).toHaveBeenCalledWith('tenant-1', {
      name: 'Glifosato',
      unit: 'L',
    });
    expect(updateInput.execute).toHaveBeenCalledWith('input-1', 'tenant-1', {
      name: 'Atrazina',
    });
  });

  it('drops undefined update fields instead of forwarding them', async () => {
    updateInput.execute.mockResolvedValue(mockInput);

    await controller.update('input-1', req as never, { unit: 'kg' });

    expect(updateInput.execute).toHaveBeenCalledWith('input-1', 'tenant-1', {
      unit: 'kg',
    });
  });

  it('maps domain errors to HTTP exceptions', async () => {
    findAllInputs.execute.mockRejectedValue(new InvalidInputError('tenantId is required'));
    await expect(controller.findAll(req as never)).rejects.toThrow(
      BadRequestException,
    );

    createInput.execute.mockRejectedValue(
      new DuplicateEntityError('An input with this name already exists'),
    );
    await expect(
      controller.create(req as never, { name: 'Glifosato', unit: 'L' }),
    ).rejects.toThrow(ConflictException);

    findInput.execute.mockRejectedValue(
      new EntityNotFoundError('Input with id input-9 not found'),
    );
    await expect(controller.findOne('input-9', req as never)).rejects.toThrow(
      NotFoundException,
    );
  });
});
