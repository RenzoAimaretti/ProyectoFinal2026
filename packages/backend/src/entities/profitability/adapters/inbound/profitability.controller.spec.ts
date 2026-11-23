import 'reflect-metadata';
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  RequestMethod,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { UpstreamUnavailableError } from '../../../../integrations/shared/domain/errors';
import { MarketUnavailableError } from '../../../valuation/domain/errors';
import { GetLotProfitabilityDetailUseCase } from '../../application/use-cases/get-lot-profitability-detail.use-case';
import { GetLotProfitabilityListUseCase } from '../../application/use-cases/get-lot-profitability-list.use-case';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { ProfitabilityController } from './profitability.controller';

const admin = {
  user: {
    id: 'admin-1',
    tenantId: 'tenant-1',
    firmaId: 'company-1',
    role: 'ADMIN',
  },
};

function build() {
  const list = { execute: jest.fn().mockResolvedValue({ lots: [] }) };
  const detail = { execute: jest.fn().mockResolvedValue({ lot: {} }) };
  const controller = new ProfitabilityController(
    list as unknown as GetLotProfitabilityListUseCase,
    detail as unknown as GetLotProfitabilityDetailUseCase,
  );
  return { controller, list, detail };
}

const ROUTES = ['findLots', 'findLotDetail'] as const;

function contextFor(
  route: (typeof ROUTES)[number],
  role: string | undefined,
): ExecutionContext {
  const handler = (
    ProfitabilityController.prototype as unknown as Record<
      string,
      () => unknown
    >
  )[route];
  return {
    getHandler: () => handler,
    getClass: () => ProfitabilityController,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('ProfitabilityController access control', () => {
  const rolesGuard = new RolesGuard(new Reflector());

  it('requires JWT and roles on every route', () => {
    const classGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      ProfitabilityController,
    ) as unknown[];

    expect(classGuards).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
  });

  it('declares ADMIN as the only role, and no handler widens it', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ProfitabilityController)).toEqual([
      'ADMIN',
    ]);
    for (const route of ROUTES) {
      const handlerRoles = Reflect.getMetadata(
        ROLES_KEY,
        ProfitabilityController.prototype[route],
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

  it.each([
    'SUPERVISOR',
    'OPERARIO',
    'PRODUCTOR',
    'CONTRATISTA',
    'VETERINARIO',
    'INGENIERO',
  ])('answers 403 to %s on every route', (role) => {
    for (const route of ROUTES) {
      expect(() => rolesGuard.canActivate(contextFor(route, role))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('answers 403 to a request that carries no role', () => {
    for (const route of ROUTES) {
      expect(() =>
        rolesGuard.canActivate(contextFor(route, undefined)),
      ).toThrow(ForbiddenException);
    }
  });

  it('answers 401 without a token (JwtAuthGuard rejects a missing user)', () => {
    const guard = new JwtAuthGuard();

    expect(() => {
      guard.handleRequest(null, false, undefined);
    }).toThrow(UnauthorizedException);
  });
});

describe('ProfitabilityController routes', () => {
  type Handler = (...args: unknown[]) => unknown;
  function routeOf(handler: string) {
    const method = (
      ProfitabilityController.prototype as unknown as Record<string, Handler>
    )[handler];
    return {
      verb: Reflect.getMetadata(METHOD_METADATA, method) as RequestMethod,
      path: Reflect.getMetadata(PATH_METADATA, method) as string,
    };
  }

  it('mounts under /profitability', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProfitabilityController)).toBe(
      'profitability',
    );
  });

  it.each([
    ['findLots', RequestMethod.GET, 'lots'],
    ['findLotDetail', RequestMethod.GET, 'lots/:lotId'],
  ])('binds %s to its verb and path', (handler, verb, path) => {
    expect(routeOf(handler)).toEqual({ verb, path });
  });
});

describe('ProfitabilityController', () => {
  it('lists with the company and tenant of the token and the filters of the query', async () => {
    const { controller, list } = build();

    await expect(
      controller.findLots(admin, {
        campaign: '2025/26',
        mode: 'A_VALOR_HOY',
      }),
    ).resolves.toEqual({ lots: [] });

    expect(list.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      tenantId: 'tenant-1',
      campaign: '2025/26',
      from: undefined,
      to: undefined,
      mode: 'A_VALOR_HOY',
    });
  });

  it('passes a custom range through', async () => {
    const { controller, list } = build();

    await controller.findLots(admin, {
      from: '2026-01-01',
      to: '2026-03-31',
    });

    expect(list.execute).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-01-01', to: '2026-03-31' }),
    );
  });

  it('ignores a companyId (or tenantId) in the query: the firm is the one of the token', async () => {
    const { controller, list, detail } = build();
    const hostile = { companyId: 'company-9', tenantId: 'tenant-9' };

    await controller.findLots(admin, hostile as never);
    await controller.findLotDetail(admin, 'lot-1', hostile as never);

    for (const mock of [list, detail]) {
      expect(mock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
          tenantId: 'tenant-1',
        }),
      );
      expect(JSON.stringify(mock.execute.mock.calls)).not.toContain(
        'company-9',
      );
      expect(JSON.stringify(mock.execute.mock.calls)).not.toContain('tenant-9');
    }
  });

  it('opens the detail of a lot with the same filters', async () => {
    const { controller, detail } = build();

    await controller.findLotDetail(admin, 'lot-7', {
      campaign: '2025/26',
      mode: 'AL_APROBAR',
    });

    expect(detail.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      tenantId: 'tenant-1',
      lotId: 'lot-7',
      campaign: '2025/26',
      from: undefined,
      to: undefined,
      mode: 'AL_APROBAR',
    });
  });

  it('answers 400 to a repeated (non-string) filter', async () => {
    const { controller, list } = build();

    await expect(
      controller.findLots(admin, { campaign: ['2025/26', '2024/25'] } as never),
    ).rejects.toThrow(BadRequestException);
    expect(list.execute).not.toHaveBeenCalled();
  });

  it('translates an invalid campaign, range or mode to 400', async () => {
    const { controller, list } = build();
    list.execute.mockRejectedValue(new InvalidInputError('Campaña inválida'));

    await expect(
      controller.findLots(admin, { campaign: '2025/28' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('translates a lot that is not in the tenant to 404', async () => {
    const { controller, detail } = build();
    detail.execute.mockRejectedValue(new EntityNotFoundError('Lote'));

    await expect(controller.findLotDetail(admin, 'x', {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('translates a missing market price in A_VALOR_HOY to 503 with a clear message', async () => {
    const { controller, list } = build();
    list.execute.mockRejectedValue(new MarketUnavailableError());

    const failure = await controller
      .findLots(admin, { mode: 'A_VALOR_HOY' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect((failure as Error).message).toContain('precio');
  });

  it('translates an upstream outage to 503 without leaking the cause', async () => {
    const { controller, list } = build();
    list.execute.mockRejectedValue(
      new UpstreamUnavailableError('https://secret.example/boom'),
    );

    const failure = await controller
      .findLots(admin, { mode: 'A_VALOR_HOY' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect((failure as Error).message).not.toContain('secret.example');
  });

  it('lets an unexpected error propagate', async () => {
    const { controller, list } = build();
    list.execute.mockRejectedValue(new Error('boom'));

    await expect(controller.findLots(admin, {})).rejects.toThrow('boom');
  });
});
