import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { UpstreamUnavailableError } from '../../../../integrations/shared/domain/errors';
import { MarketUnavailableError } from '../../../valuation/domain/errors';
import { CreateExpenseSuggestionUseCase } from '../../application/use-cases/create-expense-suggestion.use-case';
import { CreateExpenseUseCase } from '../../application/use-cases/create-expense.use-case';
import { DeleteExpenseUseCase } from '../../application/use-cases/delete-expense.use-case';
import { FindExpensesUseCase } from '../../application/use-cases/find-expenses.use-case';
import { PreviewExpenseUseCase } from '../../application/use-cases/preview-expense.use-case';
import { UpdateExpenseUseCase } from '../../application/use-cases/update-expense.use-case';
import {
  ConcurrentModificationError,
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  PendingSuggestionError,
} from '../../domain/errors';
import { ExpenseController } from './expense.controller';

const supervisor = {
  user: {
    id: 'sup-1',
    tenantId: 'tenant-1',
    firmaId: 'company-1',
    role: 'SUPERVISOR',
  },
};
const admin = {
  user: {
    id: 'admin-1',
    tenantId: 'tenant-1',
    firmaId: 'company-1',
    role: 'ADMIN',
  },
};

function build() {
  const preview = { execute: jest.fn().mockResolvedValue({ amountArs: '1' }) };
  const create = { execute: jest.fn().mockResolvedValue({ id: 'e1' }) };
  const find = { execute: jest.fn().mockResolvedValue([{ id: 'e1' }]) };
  const update = { execute: jest.fn().mockResolvedValue({ id: 'e1' }) };
  const remove = { execute: jest.fn().mockResolvedValue({ message: 'ok' }) };
  const suggest = { execute: jest.fn().mockResolvedValue({ id: 's1' }) };
  const controller = new ExpenseController(
    preview as unknown as PreviewExpenseUseCase,
    create as unknown as CreateExpenseUseCase,
    find as unknown as FindExpensesUseCase,
    update as unknown as UpdateExpenseUseCase,
    remove as unknown as DeleteExpenseUseCase,
    suggest as unknown as CreateExpenseSuggestionUseCase,
  );
  return { controller, preview, create, find, update, remove, suggest };
}

type Route = 'preview' | 'create' | 'findAll' | 'update' | 'remove' | 'suggest';

/** endpoint -> roles that may call it (design 2.11). */
const MATRIX: Record<Route, readonly string[]> = {
  preview: ['ADMIN', 'SUPERVISOR'],
  create: ['ADMIN', 'SUPERVISOR'],
  findAll: ['ADMIN', 'SUPERVISOR'],
  update: ['ADMIN'],
  remove: ['ADMIN'],
  suggest: ['SUPERVISOR'],
};
const ALL_ROLES = [
  'ADMIN',
  'SUPERVISOR',
  'OPERARIO',
  'PRODUCTOR',
  'CONTRATISTA',
  'VETERINARIO',
  'INGENIERO',
];

function handlerOf(route: string): () => unknown {
  return (
    ExpenseController.prototype as unknown as Record<string, () => unknown>
  )[route];
}

function contextFor(route: Route, role: string | undefined): ExecutionContext {
  const handler = (
    ExpenseController.prototype as unknown as Record<string, () => unknown>
  )[route];
  return {
    getHandler: () => handler,
    getClass: () => ExpenseController,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('ExpenseController access control (R-FIN-11, R-FIN-15)', () => {
  const guard = new RolesGuard(new Reflector());

  it('requires JWT and roles at class level', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ExpenseController)).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
  });

  it('answers 401 without a token', () => {
    const guard = new JwtAuthGuard();
    expect(() => {
      guard.handleRequest(null, false, undefined);
    }).toThrow(UnauthorizedException);
  });

  describe.each(Object.keys(MATRIX) as Route[])('%s', (route) => {
    it.each(ALL_ROLES)('role %s', (role) => {
      const ctx = contextFor(route, role);
      if (MATRIX[route].includes(role)) {
        expect(guard.canActivate(ctx)).toBe(true);
      } else {
        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      }
    });

    it('answers 403 without a role', () => {
      expect(() => guard.canActivate(contextFor(route, undefined))).toThrow(
        ForbiddenException,
      );
    });
  });

  it('declares the direct edit and delete as ADMIN-only and the suggestion as SUPERVISOR-only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, handlerOf('update'))).toEqual([
      'ADMIN',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handlerOf('remove'))).toEqual([
      'ADMIN',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handlerOf('suggest'))).toEqual([
      'SUPERVISOR',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, ExpenseController)).toEqual([
      'ADMIN',
      'SUPERVISOR',
    ]);
  });
});

describe('ExpenseController', () => {
  it('creates with the firma, tenant and user of the token and ignores a companyId in the body', async () => {
    const { controller, create } = build();
    const body = {
      lotId: 'lot-1',
      amount: '1',
      companyId: 'company-EVIL',
      tenantId: 'EVIL',
    };

    await controller.create(supervisor, body);

    expect(create.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      tenantId: 'tenant-1',
      userId: 'sup-1',
      body,
    });
  });

  it('lists by the firma of the token and ignores a companyId in the query', async () => {
    const { controller, find } = build();
    const query = { lotId: 'lot-1', companyId: 'company-EVIL' };

    await controller.findAll(admin, query);

    expect(find.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      query,
    });
  });

  it('previews without any firma-specific input', async () => {
    const { controller, preview } = build();

    await expect(
      controller.preview({ amount: '1', unit: 'ARS' }),
    ).resolves.toEqual({
      amountArs: '1',
    });
    expect(preview.execute).toHaveBeenCalledWith({ amount: '1', unit: 'ARS' });
  });

  it('edits and deletes by the firma of the token', async () => {
    const { controller, update, remove } = build();

    await controller.update('e1', admin, {
      amount: '5',
      companyId: 'company-EVIL',
    });
    await controller.remove('e1', admin);

    expect(update.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      tenantId: 'tenant-1',
      userId: 'admin-1',
      id: 'e1',
      body: { amount: '5', companyId: 'company-EVIL' },
    });
    expect(remove.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      userId: 'admin-1',
      id: 'e1',
    });
  });

  it('creates a suggestion as the supervisor of the token', async () => {
    const { controller, suggest } = build();

    await controller.suggest('e1', supervisor, {
      kind: 'BAJA',
      companyId: 'company-EVIL',
    });

    expect(suggest.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      tenantId: 'tenant-1',
      userId: 'sup-1',
      expenseId: 'e1',
      body: { kind: 'BAJA', companyId: 'company-EVIL' },
    });
  });

  it('translates domain errors to HTTP: 404, 400, 409 (duplicate, pending, concurrent)', async () => {
    const { controller, update, suggest, create } = build();

    update.execute.mockRejectedValueOnce(new EntityNotFoundError('nf'));
    await expect(controller.update('e', admin, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );

    create.execute.mockRejectedValueOnce(new InvalidInputError('bad'));
    await expect(controller.create(supervisor, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );

    update.execute.mockRejectedValueOnce(new PendingSuggestionError('pending'));
    await expect(controller.update('e', admin, {})).rejects.toBeInstanceOf(
      ConflictException,
    );

    suggest.execute.mockRejectedValueOnce(new DuplicateEntityError('dup'));
    await expect(
      controller.suggest('e', supervisor, {}),
    ).rejects.toBeInstanceOf(ConflictException);

    update.execute.mockRejectedValueOnce(
      new ConcurrentModificationError('retry'),
    );
    await expect(controller.update('e', admin, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('answers 503 with the "retry or enter it in ARS" notice when the price is unavailable (D25) without leaking upstream detail', async () => {
    const { controller, create, preview } = build();

    create.execute.mockRejectedValueOnce(
      new MarketUnavailableError('Precio no disponible para MAIZ'),
    );
    const error: unknown = await controller
      .create(supervisor, {})
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(
      JSON.stringify((error as ServiceUnavailableException).getResponse()),
    ).toMatch(/ARS/);

    preview.execute.mockRejectedValueOnce(
      new UpstreamUnavailableError('http://secret.upstream/x'),
    );
    const upstream: unknown = await controller
      .preview({})
      .catch((e: unknown) => e);
    expect(upstream).toBeInstanceOf(ServiceUnavailableException);
    expect(
      JSON.stringify((upstream as ServiceUnavailableException).getResponse()),
    ).not.toContain('secret.upstream');
  });

  it('propagates unknown errors', async () => {
    const { controller, find } = build();
    const boom = new Error('boom');
    find.execute.mockRejectedValueOnce(boom);

    await expect(controller.findAll(admin, {})).rejects.toBe(boom);
  });
});
