import 'reflect-metadata';
import {
  BadRequestException,
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
import { DeleteTariffUseCase } from '../../application/use-cases/delete-tariff.use-case';
import { FindTariffsUseCase } from '../../application/use-cases/find-tariffs.use-case';
import { GetTariffKgEquivalentsUseCase } from '../../application/use-cases/get-tariff-kg-equivalents.use-case';
import { UpsertTariffUseCase } from '../../application/use-cases/upsert-tariff.use-case';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { TariffController } from './tariff.controller';

const admin = {
  user: {
    id: 'admin-1',
    tenantId: 'tenant-1',
    firmaId: 'company-1',
    role: 'ADMIN',
  },
};

const body = {
  price: {
    amount: '12',
    unit: 'KG_CEREAL',
    grain: 'SOJA',
    basis: 'POR_HECTAREA',
  },
  cost: { amount: '8000', unit: 'ARS', basis: 'POR_HORA' },
};

function build() {
  const find = { execute: jest.fn().mockResolvedValue([{ id: 't1' }]) };
  const upsert = { execute: jest.fn().mockResolvedValue({ id: 't1' }) };
  const remove = { execute: jest.fn().mockResolvedValue(undefined) };
  const kg = {
    execute: jest.fn().mockResolvedValue({ grain: 'SOJA', items: [] }),
  };
  const controller = new TariffController(
    find as unknown as FindTariffsUseCase,
    upsert as unknown as UpsertTariffUseCase,
    remove as unknown as DeleteTariffUseCase,
    kg as unknown as GetTariffKgEquivalentsUseCase,
  );
  return { controller, find, upsert, remove, kg };
}

const ROUTES = ['findAll', 'kgEquivalents', 'upsert', 'remove'] as const;

function contextFor(
  route: (typeof ROUTES)[number],
  role: string | undefined,
): ExecutionContext {
  const handler = (
    TariffController.prototype as unknown as Record<string, () => unknown>
  )[route];
  return {
    getHandler: () => handler,
    getClass: () => TariffController,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('TariffController access control', () => {
  const rolesGuard = new RolesGuard(new Reflector());

  it('requires JWT and roles on every route', () => {
    const classGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      TariffController,
    ) as unknown[];

    expect(classGuards).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
  });

  it('declares ADMIN as the only role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, TariffController)).toEqual(['ADMIN']);
    for (const route of ROUTES) {
      const handlerRoles = Reflect.getMetadata(
        ROLES_KEY,
        TariffController.prototype[route],
      ) as string[] | undefined;
      expect(
        handlerRoles === undefined ||
          (handlerRoles.length === 1 && handlerRoles[0] === 'ADMIN'),
      ).toBe(true);
    }
  });

  it('lets an ADMIN through every route', () => {
    for (const route of ROUTES) {
      expect(rolesGuard.canActivate(contextFor(route, 'ADMIN'))).toBe(true);
    }
  });

  it('answers 403 to SUPERVISOR and OPERARIO on every route', () => {
    for (const route of ROUTES) {
      for (const role of ['SUPERVISOR', 'OPERARIO']) {
        expect(() => rolesGuard.canActivate(contextFor(route, role))).toThrow(
          ForbiddenException,
        );
      }
    }
  });

  it('answers 403 to the other roles', () => {
    for (const role of [
      'PRODUCTOR',
      'CONTRATISTA',
      'VETERINARIO',
      'INGENIERO',
    ]) {
      expect(() => rolesGuard.canActivate(contextFor('findAll', role))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('answers 401 without a token (JwtAuthGuard rejects a missing user)', () => {
    const guard = new JwtAuthGuard();

    expect(() => {
      guard.handleRequest(null, false, undefined);
    }).toThrow(UnauthorizedException);
  });
});

describe('TariffController', () => {
  it('lists the tariffs of the company in the token', async () => {
    const { controller, find } = build();

    await expect(controller.findAll(admin)).resolves.toEqual([{ id: 't1' }]);
    expect(find.execute).toHaveBeenCalledWith({ companyId: 'company-1' });
  });

  it('upserts with the company and tenant of the token and ignores a companyId in the body', async () => {
    const { controller, upsert } = build();

    await controller.upsert('labor-1', admin, {
      ...body,
      companyId: 'company-EVIL',
    } as never);

    expect(upsert.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      tenantId: 'tenant-1',
      userId: 'admin-1',
      laborTypeId: 'labor-1',
      price: body.price,
      cost: body.cost,
    });
  });

  it('body companyId and firmaId are ignored', async () => {
    const { controller, upsert } = build();
    const req = {
      user: { id: 'admin-1', tenantId: 'tenant-1', firmaId: 'A' },
    };

    await controller.upsert('labor-1', req, {
      companyId: 'other',
      firmaId: 'other',
      ...body,
    } as never);

    expect(upsert.execute).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'A' }),
    );
  });

  it('deletes by the company of the token', async () => {
    const { controller, remove } = build();

    await controller.remove('labor-1', admin);

    expect(remove.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      laborTypeId: 'labor-1',
    });
  });

  it('computes the equivalents for the grain in the query and ignores a companyId query', async () => {
    const { controller, kg } = build();

    await controller.kgEquivalents(admin, {
      grain: 'TRIGO',
      companyId: 'company-EVIL',
    } as never);

    expect(kg.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      grain: 'TRIGO',
    });
  });

  it('translates domain errors to HTTP', async () => {
    const { controller, upsert, remove, kg } = build();

    upsert.execute.mockRejectedValueOnce(
      new InvalidInputError('El precio es obligatorio'),
    );
    await expect(
      controller.upsert('l', admin, body as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    upsert.execute.mockRejectedValueOnce(
      new EntityNotFoundError('Labor type not found'),
    );
    await expect(
      controller.upsert('l', admin, body as never),
    ).rejects.toBeInstanceOf(NotFoundException);

    remove.execute.mockRejectedValueOnce(
      new EntityNotFoundError('Tariff not found'),
    );
    await expect(controller.remove('l', admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    kg.execute.mockRejectedValueOnce(new InvalidInputError('grano'));
    await expect(
      controller.kgEquivalents(admin, { grain: 'X' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('answers 503 with a generic message when the market is unavailable', async () => {
    const { controller, kg } = build();

    kg.execute.mockRejectedValueOnce(
      new MarketUnavailableError('Precio no disponible para SOJA'),
    );
    const error: unknown = await controller
      .kgEquivalents(admin, { grain: 'SOJA' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);

    kg.execute.mockRejectedValueOnce(
      new UpstreamUnavailableError('http://secret.upstream/detail'),
    );
    const upstream: unknown = await controller
      .kgEquivalents(admin, { grain: 'SOJA' })
      .catch((e: unknown) => e);
    expect(upstream).toBeInstanceOf(ServiceUnavailableException);
    expect(
      JSON.stringify((upstream as ServiceUnavailableException).getResponse()),
    ).not.toContain('secret.upstream');
  });

  it('rethrows unexpected errors', async () => {
    const { controller, find } = build();
    find.execute.mockRejectedValueOnce(new TypeError('bug'));

    await expect(controller.findAll(admin)).rejects.toBeInstanceOf(TypeError);
  });
});
