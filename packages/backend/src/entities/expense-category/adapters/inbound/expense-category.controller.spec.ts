import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import {
  CategoryInUseError,
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { CreateExpenseCategoryUseCase } from '../../application/use-cases/create-expense-category.use-case';
import { DeleteExpenseCategoryUseCase } from '../../application/use-cases/delete-expense-category.use-case';
import { FindAllExpenseCategoriesUseCase } from '../../application/use-cases/find-all-expense-categories.use-case';
import { UpdateExpenseCategoryUseCase } from '../../application/use-cases/update-expense-category.use-case';
import { ExpenseCategoryController } from './expense-category.controller';

const req = { user: { id: 'u1', tenantId: 'tenant-1', firmaId: 'company-1' } };

function build() {
  const all = { execute: jest.fn().mockResolvedValue([{ id: 'c1' }]) };
  const create = { execute: jest.fn().mockResolvedValue({ id: 'c1' }) };
  const update = { execute: jest.fn().mockResolvedValue({ id: 'c1' }) };
  const remove = { execute: jest.fn().mockResolvedValue({ message: 'ok' }) };
  const controller = new ExpenseCategoryController(
    all as unknown as FindAllExpenseCategoriesUseCase,
    create as unknown as CreateExpenseCategoryUseCase,
    update as unknown as UpdateExpenseCategoryUseCase,
    remove as unknown as DeleteExpenseCategoryUseCase,
  );
  return { controller, all, create, update, remove };
}

const ROUTES = ['findAll', 'create', 'update', 'remove'] as const;

function contextFor(
  route: (typeof ROUTES)[number],
  role: string | undefined,
): ExecutionContext {
  const handler = (
    ExpenseCategoryController.prototype as unknown as Record<
      string,
      () => unknown
    >
  )[route];
  return {
    getHandler: () => handler,
    getClass: () => ExpenseCategoryController,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('ExpenseCategoryController access control (R-FIN-15)', () => {
  const guard = new RolesGuard(new Reflector());

  it('requires JWT and roles at class level', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ExpenseCategoryController),
    ).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(Reflect.getMetadata(ROLES_KEY, ExpenseCategoryController)).toEqual([
      'ADMIN',
      'SUPERVISOR',
    ]);
  });

  it('lets ADMIN and SUPERVISOR through every route', () => {
    for (const route of ROUTES) {
      for (const role of ['ADMIN', 'SUPERVISOR']) {
        expect(guard.canActivate(contextFor(route, role))).toBe(true);
      }
    }
  });

  it('answers 403 to OPERARIO and every other role on every route', () => {
    for (const route of ROUTES) {
      for (const role of [
        'OPERARIO',
        'PRODUCTOR',
        'CONTRATISTA',
        'VETERINARIO',
        'INGENIERO',
      ]) {
        expect(() => guard.canActivate(contextFor(route, role))).toThrow(
          ForbiddenException,
        );
      }
    }
  });
});

describe('ExpenseCategoryController', () => {
  it('lists, creates, updates and deletes with the tenant of the token only', async () => {
    const { controller, all, create, update, remove } = build();

    await controller.findAll(req);
    await controller.create(req, { name: 'Flete', tenantId: 'EVIL' } as never);
    await controller.update('c1', req, {
      active: false,
      tenantId: 'EVIL',
    } as never);
    await controller.remove('c1', req);

    expect(all.execute).toHaveBeenCalledWith('tenant-1');
    expect(create.execute).toHaveBeenCalledWith('tenant-1', { name: 'Flete' });
    expect(update.execute).toHaveBeenCalledWith('c1', 'tenant-1', {
      active: false,
    });
    expect(remove.execute).toHaveBeenCalledWith('c1', 'tenant-1');
  });

  it('translates domain errors: 409 duplicate and in use, 404, 400', async () => {
    const { controller, create, remove, update } = build();

    create.execute.mockRejectedValueOnce(new DuplicateEntityError('dup'));
    await expect(
      controller.create(req, { name: 'Flete' }),
    ).rejects.toBeInstanceOf(ConflictException);
    remove.execute.mockRejectedValueOnce(new CategoryInUseError('in use'));
    await expect(controller.remove('c1', req)).rejects.toBeInstanceOf(
      ConflictException,
    );
    remove.execute.mockRejectedValueOnce(new EntityNotFoundError('nf'));
    await expect(controller.remove('c1', req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    update.execute.mockRejectedValueOnce(new InvalidInputError('bad'));
    await expect(controller.update('c1', req, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
