import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import {
  ReceptionItemValidation,
  ReceptionRecord,
} from '../../application/reception.types';
import { CreateReceptionUseCase } from '../../application/use-cases/create-reception.use-case';
import { FindReceptionByTenantUseCase } from '../../application/use-cases/find-reception-by-tenant.use-case';
import { FindReceptionsByTenantUseCase } from '../../application/use-cases/find-receptions-by-tenant.use-case';
import { RejectReceptionUseCase } from '../../application/use-cases/reject-reception.use-case';
import { ValidateReceptionUseCase } from '../../application/use-cases/validate-reception.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import { ReceptionController } from './reception.controller';

const mockUser = {
  id: 'admin-1',
  tenantId: 'tenant-1',
  firmaId: 'company-1',
};

const mockReception: ReceptionRecord = {
  id: 'reception-1',
  clientId: 'client-1',
  date: new Date('2026-04-01T00:00:00.000Z'),
  status: 'PENDIENTE_VALIDACION',
  rejectionReason: null,
  validatedBy: null,
  validatedAt: null,
  createdAt: new Date('2026-04-01T10:00:00.000Z'),
  updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  clientName: 'Estancia La Esperanza',
  items: [
    {
      id: 'item-1',
      receptionId: 'reception-1',
      inputId: 'input-1',
      quantity: 10,
      validatedQuantity: null,
      quantityVariance: null,
      inputName: 'Glifosato',
      unit: 'L',
    },
  ],
};

const agreedItems: ReceptionItemValidation[] = [
  { inputId: 'input-1', validatedQuantity: 8 },
];

describe('ReceptionController', () => {
  let controller: ReceptionController;
  let createReception: jest.Mocked<CreateReceptionUseCase>;
  let findByTenant: jest.Mocked<FindReceptionsByTenantUseCase>;
  let findOneByTenant: jest.Mocked<FindReceptionByTenantUseCase>;
  let validateReception: jest.Mocked<ValidateReceptionUseCase>;
  let rejectReception: jest.Mocked<RejectReceptionUseCase>;

  beforeEach(() => {
    createReception = { execute: jest.fn() } as unknown as jest.Mocked<CreateReceptionUseCase>;
    findByTenant = { execute: jest.fn() } as unknown as jest.Mocked<FindReceptionsByTenantUseCase>;
    findOneByTenant = { execute: jest.fn() } as unknown as jest.Mocked<FindReceptionByTenantUseCase>;
    validateReception = { execute: jest.fn() } as unknown as jest.Mocked<ValidateReceptionUseCase>;
    rejectReception = { execute: jest.fn() } as unknown as jest.Mocked<RejectReceptionUseCase>;

    controller = new ReceptionController(
      createReception,
      findByTenant,
      findOneByTenant,
      validateReception,
      rejectReception,
    );
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'create', 'validate', 'reject'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        ReceptionController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  describe('GET /receptions', () => {
    it('lists the receptions of the tenant from req.user.tenantId', async () => {
      findByTenant.execute.mockResolvedValue([mockReception]);

      await expect(
        controller.findAll({ user: mockUser } as never),
      ).resolves.toEqual([mockReception]);

      expect(findByTenant.execute).toHaveBeenCalledWith('tenant-1');
    });

    it('translates InvalidInputError to 400', async () => {
      findByTenant.execute.mockRejectedValue(new InvalidInputError('tenantId is required'));

      await expect(
        controller.findAll({ user: mockUser } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /receptions/:id', () => {
    it('reads the reception scoped to the caller tenant', async () => {
      findOneByTenant.execute.mockResolvedValue(mockReception);

      await expect(
        controller.findOne('reception-1', { user: mockUser } as never),
      ).resolves.toEqual(mockReception);

      expect(findOneByTenant.execute).toHaveBeenCalledWith(
        'reception-1',
        'tenant-1',
      );
    });

    it('translates EntityNotFoundError to 404', async () => {
      findOneByTenant.execute.mockRejectedValue(
        new EntityNotFoundError('Reception with id reception-9 not found'),
      );

      await expect(
        controller.findOne('reception-9', { user: mockUser } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /receptions', () => {
    it('creates the reception with the body client scope', async () => {
      createReception.execute.mockResolvedValue(mockReception);

      await expect(
        controller.create({
          clientId: 'client-1',
          date: '2026-04-01T00:00:00.000Z',
          items: [{ inputId: 'input-1', quantity: 10 }],
        }),
      ).resolves.toEqual(mockReception);

      expect(createReception.execute).toHaveBeenCalledWith('client-1', {
        date: '2026-04-01T00:00:00.000Z',
        items: [{ inputId: 'input-1', quantity: 10 }],
      });
    });

    it('translates InvalidRelationError to 400', async () => {
      createReception.execute.mockRejectedValue(
        new InvalidRelationError('Client with id client-9 not found'),
      );

      await expect(
        controller.create({
          clientId: 'client-9',
          date: '2026-04-01T00:00:00.000Z',
          items: [{ inputId: 'input-1', quantity: 10 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /receptions/:id/validate', () => {
    it('resolves the client scope from the tenant-scoped read and validates', async () => {
      findOneByTenant.execute.mockResolvedValue(mockReception);
      validateReception.execute.mockResolvedValue({
        ...mockReception,
        status: 'VALIDADA',
      });

      await expect(
        controller.validate('reception-1', { user: mockUser } as never, {
          items: agreedItems,
        }),
      ).resolves.toEqual({ ...mockReception, status: 'VALIDADA' });

      expect(findOneByTenant.execute).toHaveBeenCalledWith(
        'reception-1',
        'tenant-1',
      );
      expect(validateReception.execute).toHaveBeenCalledWith(
        'client-1',
        'reception-1',
        'admin-1',
        agreedItems,
      );
    });

    it('does not decide when the reception is outside the tenant', async () => {
      findOneByTenant.execute.mockRejectedValue(
        new EntityNotFoundError('Reception with id reception-9 not found'),
      );

      await expect(
        controller.validate('reception-9', { user: mockUser } as never, {
          items: agreedItems,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(validateReception.execute).not.toHaveBeenCalled();
    });

    it('translates InvalidStateTransitionError to 409', async () => {
      findOneByTenant.execute.mockResolvedValue(mockReception);
      validateReception.execute.mockRejectedValue(
        new InvalidStateTransitionError('already decided'),
      );

      await expect(
        controller.validate('reception-1', { user: mockUser } as never, {
          items: agreedItems,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('POST /receptions/:id/reject', () => {
    it('resolves the client scope from the tenant-scoped read and rejects', async () => {
      findOneByTenant.execute.mockResolvedValue(mockReception);
      rejectReception.execute.mockResolvedValue({
        ...mockReception,
        status: 'RECHAZADA',
        rejectionReason: 'cantidad distinta',
      });

      await expect(
        controller.reject('reception-1', { user: mockUser } as never, {
          reason: 'cantidad distinta',
        }),
      ).resolves.toEqual({
        ...mockReception,
        status: 'RECHAZADA',
        rejectionReason: 'cantidad distinta',
      });

      expect(rejectReception.execute).toHaveBeenCalledWith(
        'client-1',
        'reception-1',
        'cantidad distinta',
      );
    });

    it('passes an undefined reason when the body is empty so the use case rejects it', async () => {
      findOneByTenant.execute.mockResolvedValue(mockReception);
      rejectReception.execute.mockRejectedValue(
        new InvalidInputError('rejectionReason is required'),
      );

      await expect(
        controller.reject('reception-1', { user: mockUser } as never, {}),
      ).rejects.toThrow(BadRequestException);

      expect(rejectReception.execute).toHaveBeenCalledWith(
        'client-1',
        'reception-1',
        undefined,
      );
    });
  });
});
