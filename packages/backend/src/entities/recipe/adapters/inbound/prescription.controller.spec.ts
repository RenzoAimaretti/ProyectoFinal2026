import 'reflect-metadata';
import { BadRequestException, NotFoundException, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { ROLES_KEY } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { PendingPrescriptionTask } from '../../application/recipe.types';
import { FindPendingPrescriptionsUseCase } from '../../application/use-cases/find-pending-prescriptions.use-case';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { PrescriptionController } from './prescription.controller';

const pendingTask: PendingPrescriptionTask = {
  id: 'task-1',
  lotId: 'lot-1',
  lotName: 'Lote N°1',
  farmName: 'Agro-Sur',
  taskTypeId: 'task-type-1',
  taskTypeName: 'Pulverización',
  status: 'PENDIENTE',
  startedAt: new Date('2026-01-10T00:00:00.000Z'),
  prescriptionStatus: 'SIN_RECETA',
};

const req = { user: { tenantId: 'tenant-1' } };

function metadata(key: string, method: keyof PrescriptionController): unknown {
  return Reflect.getMetadata(
    key,
    PrescriptionController.prototype[method] as (...args: never[]) => unknown,
  );
}

describe('PrescriptionController', () => {
  let useCase: jest.Mocked<FindPendingPrescriptionsUseCase>;
  let controller: PrescriptionController;

  beforeEach(() => {
    useCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindPendingPrescriptionsUseCase>;
    controller = new PrescriptionController(useCase);
  });

  it('serves GET /prescriptions/pending', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PrescriptionController)).toBe(
      'prescriptions',
    );
    expect(metadata(PATH_METADATA, 'findPending')).toBe('pending');
    expect(metadata(METHOD_METADATA, 'findPending')).toBe(RequestMethod.GET);
  });

  it('guards the route exactly like the other authenticated reads', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      PrescriptionController.prototype.findPending,
    ) as Array<new (...args: never[]) => unknown> | undefined;

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(metadata(ROLES_KEY, 'findPending')).toEqual([
      'INGENIERO',
      'ADMIN',
      'SUPERVISOR',
    ]);
  });

  it('delegates the tenant-scoped inbox to the use case', async () => {
    useCase.execute.mockResolvedValue([pendingTask]);

    await expect(controller.findPending(req as never)).resolves.toEqual([
      pendingTask,
    ]);
    expect(useCase.execute).toHaveBeenCalledWith('tenant-1');
  });

  it('maps an application not-found to 404', async () => {
    useCase.execute.mockRejectedValue(
      new EntityNotFoundError('Inbox not available'),
    );

    await expect(controller.findPending(req as never)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps invalid input to 400', async () => {
    useCase.execute.mockRejectedValue(new InvalidInputError('tenantId is required'));

    await expect(controller.findPending(req as never)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rethrows unknown infrastructure errors untouched', async () => {
    const unexpected = new Error('boom');
    useCase.execute.mockRejectedValue(unexpected);

    await expect(controller.findPending(req as never)).rejects.toBe(unexpected);
  });
});
