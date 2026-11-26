import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { MarketUnavailableError } from '../../../valuation/domain/errors';
import { ApproveExpenseSuggestionUseCase } from '../../application/use-cases/approve-expense-suggestion.use-case';
import { FindExpenseSuggestionsUseCase } from '../../application/use-cases/find-expense-suggestions.use-case';
import { RejectExpenseSuggestionUseCase } from '../../application/use-cases/reject-expense-suggestion.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  SuggestionAlreadyResolvedError,
} from '../../domain/errors';
import { ExpenseSuggestionController } from './expense-suggestion.controller';

const admin = {
  user: {
    id: 'admin-1',
    tenantId: 'tenant-1',
    firmaId: 'company-1',
    role: 'ADMIN',
  },
};
const supervisor = {
  user: {
    id: 'sup-1',
    tenantId: 'tenant-1',
    firmaId: 'company-1',
    role: 'SUPERVISOR',
  },
};

function build() {
  const find = { execute: jest.fn().mockResolvedValue([{ id: 's1' }]) };
  const approve = { execute: jest.fn().mockResolvedValue({ id: 's1' }) };
  const reject = { execute: jest.fn().mockResolvedValue({ id: 's1' }) };
  const controller = new ExpenseSuggestionController(
    find as unknown as FindExpenseSuggestionsUseCase,
    approve as unknown as ApproveExpenseSuggestionUseCase,
    reject as unknown as RejectExpenseSuggestionUseCase,
  );
  return { controller, find, approve, reject };
}

type Route = 'findAll' | 'approve' | 'reject';
const MATRIX: Record<Route, readonly string[]> = {
  findAll: ['ADMIN', 'SUPERVISOR'],
  approve: ['ADMIN'],
  reject: ['ADMIN'],
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

function contextFor(route: Route, role: string | undefined): ExecutionContext {
  const handler = (
    ExpenseSuggestionController.prototype as unknown as Record<
      string,
      () => unknown
    >
  )[route];
  return {
    getHandler: () => handler,
    getClass: () => ExpenseSuggestionController,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('ExpenseSuggestionController access control (R-FIN-11, R-FIN-15)', () => {
  const guard = new RolesGuard(new Reflector());

  it('requires JWT and roles at class level', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ExpenseSuggestionController),
    ).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
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
  });
});

describe('ExpenseSuggestionController', () => {
  it('lists with the role, user and firma of the token and ignores a companyId in the query', async () => {
    const { controller, find } = build();

    await controller.findAll(supervisor, {
      status: 'RECHAZADA',
      companyId: 'company-EVIL',
    } as never);

    expect(find.execute).toHaveBeenCalledWith({
      role: 'SUPERVISOR',
      userId: 'sup-1',
      companyId: 'company-1',
      status: 'RECHAZADA',
    });
  });

  it('approves and rejects as the admin of the token, reading only the reason from the body', async () => {
    const { controller, approve, reject } = build();

    await controller.approve('s1', admin);
    await controller.reject('s1', admin, {
      reason: 'monto correcto',
      companyId: 'EVIL',
    } as never);

    expect(approve.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      tenantId: 'tenant-1',
      userId: 'admin-1',
      id: 's1',
    });
    expect(reject.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      userId: 'admin-1',
      id: 's1',
      reason: 'monto correcto',
    });
  });

  it('translates errors: 404, 400 (rejection without reason), 409 (resolved) and 503', async () => {
    const { controller, approve, reject } = build();

    approve.execute.mockRejectedValueOnce(new EntityNotFoundError('nf'));
    await expect(controller.approve('s', admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    reject.execute.mockRejectedValueOnce(
      new InvalidInputError('reason is required'),
    );
    await expect(controller.reject('s', admin, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );

    approve.execute.mockRejectedValueOnce(
      new SuggestionAlreadyResolvedError('resolved'),
    );
    await expect(controller.approve('s', admin)).rejects.toBeInstanceOf(
      ConflictException,
    );

    approve.execute.mockRejectedValueOnce(new MarketUnavailableError('x'));
    await expect(controller.approve('s', admin)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects without a body as a missing reason', async () => {
    const { controller, reject } = build();

    await controller.reject('s1', admin, undefined as never);

    expect(reject.execute).toHaveBeenCalledWith(
      expect.objectContaining({ reason: undefined }),
    );
  });
});
