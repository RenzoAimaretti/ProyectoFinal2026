/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked ports are asserted by reference */
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreateExpenseCategoryUseCase } from '../src/entities/expense-category/application/use-cases/create-expense-category.use-case';
import { DeleteExpenseCategoryUseCase } from '../src/entities/expense-category/application/use-cases/delete-expense-category.use-case';
import { FindAllExpenseCategoriesUseCase } from '../src/entities/expense-category/application/use-cases/find-all-expense-categories.use-case';
import { UpdateExpenseCategoryUseCase } from '../src/entities/expense-category/application/use-cases/update-expense-category.use-case';
import {
  CategoryInUseError,
  DuplicateEntityError as CategoryDuplicateError,
  EntityNotFoundError as CategoryNotFoundError,
  InvalidInputError as CategoryInvalidInputError,
} from '../src/entities/expense-category/domain/errors';
import { ExpenseCategoryModule } from '../src/entities/expense-category/expense-category.module';
import { ApproveExpenseSuggestionUseCase } from '../src/entities/expense/application/use-cases/approve-expense-suggestion.use-case';
import { CreateExpenseSuggestionUseCase } from '../src/entities/expense/application/use-cases/create-expense-suggestion.use-case';
import { CreateExpenseUseCase } from '../src/entities/expense/application/use-cases/create-expense.use-case';
import { DeleteExpenseUseCase } from '../src/entities/expense/application/use-cases/delete-expense.use-case';
import { FindExpenseSuggestionsUseCase } from '../src/entities/expense/application/use-cases/find-expense-suggestions.use-case';
import { FindExpensesUseCase } from '../src/entities/expense/application/use-cases/find-expenses.use-case';
import { PreviewExpenseUseCase } from '../src/entities/expense/application/use-cases/preview-expense.use-case';
import { RejectExpenseSuggestionUseCase } from '../src/entities/expense/application/use-cases/reject-expense-suggestion.use-case';
import { UpdateExpenseUseCase } from '../src/entities/expense/application/use-cases/update-expense.use-case';
import {
  ConcurrentModificationError,
  EntityNotFoundError as ExpenseNotFoundError,
  InvalidInputError as ExpenseInvalidInputError,
  PendingSuggestionError,
  SuggestionAlreadyResolvedError,
} from '../src/entities/expense/domain/errors';
import { ExpenseModule } from '../src/entities/expense/expense.module';
import {
  MARKET_SNAPSHOT,
  MarketSnapshotPort,
} from '../src/entities/profitability/application/ports/market-snapshot.port';
import { PENDING_VALUATION_RETRY } from '../src/entities/profitability/application/ports/pending-valuation-retry.port';
import {
  PROFITABILITY_READER,
  ProfitabilityReaderPort,
} from '../src/entities/profitability/application/ports/profitability-reader.port';
import { ProfitabilityModule } from '../src/entities/profitability/profitability.module';
import { DeleteTariffUseCase } from '../src/entities/tariff/application/use-cases/delete-tariff.use-case';
import { FindTariffsUseCase } from '../src/entities/tariff/application/use-cases/find-tariffs.use-case';
import { GetTariffKgEquivalentsUseCase } from '../src/entities/tariff/application/use-cases/get-tariff-kg-equivalents.use-case';
import { UpsertTariffUseCase } from '../src/entities/tariff/application/use-cases/upsert-tariff.use-case';
import {
  EntityNotFoundError as TariffNotFoundError,
  InvalidInputError as TariffInvalidInputError,
} from '../src/entities/tariff/domain/errors';
import { TariffModule } from '../src/entities/tariff/tariff.module';
import { Dec } from '../src/entities/valuation/domain/decimal';
import { MarketUnavailableError } from '../src/entities/valuation/domain/errors';
import { MarketSnapshot } from '../src/entities/valuation/domain/market-snapshot';

/**
 * Finance HTTP contract without a database (pattern of
 * `machine-report.e2e-spec.ts`): `PrismaService` and the JWT guard are
 * overridden, the real `RolesGuard`, controllers and routing run. Tariffs,
 * categories and expenses answer through use case doubles (routes, roles and
 * error translation); the calculator runs its REAL use cases over doubles of
 * its three ports.
 */

/** The slice of the JSON answers these tests read. */
type ApiBody = {
  message: string;
  lots: Array<Record<string, string>>;
  lot: Record<string, string>;
  reports: unknown[];
  valuation: Record<string, string | null>;
};

type Doubles = Record<string, { execute: jest.Mock }>;
const double = () => ({ execute: jest.fn() });

const ROLES = [
  'ADMIN',
  'SUPERVISOR',
  'OPERARIO',
  'PRODUCTOR',
  'CONTRATISTA',
  'VETERINARIO',
  'INGENIERO',
] as const;

const emptyActivity = { lots: [], entries: [], pending: [] };

const lot1 = {
  lotId: 'lot-1',
  lotName: 'Lote 1',
  farmName: 'La Esperanza',
  clientName: 'Cliente A',
  areaHa: Dec.parse('100'),
};

const emptyDetail = {
  lot: lot1,
  reports: [],
  expenses: [],
  pending: { reports: 0, hectares: Dec.parse('0') },
};

function marketWith(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  const now = new Date('2026-11-23T11:55:00Z');
  return {
    grainArsPerTon: { SOJA: Dec.parse('330000') },
    usd: {
      oficialVenta: Dec.parse('1600'),
      oficialCompra: Dec.parse('1500'),
      bnaPizarra: null,
    },
    sources: { grains: 'cac.bcr.com.ar', usd: 'dolarapi.com' },
    fetchedAt: { grains: now, usd: now },
    stale: { grains: false, usd: false },
    ...overrides,
  };
}

describe('Finance HTTP contract (no database)', () => {
  let app: INestApplication;
  let server: App;

  const tariff: Doubles = {
    find: double(),
    upsert: double(),
    remove: double(),
    kg: double(),
  };
  const category: Doubles = {
    find: double(),
    create: double(),
    update: double(),
    remove: double(),
  };
  const expense: Doubles = {
    preview: double(),
    create: double(),
    find: double(),
    update: double(),
    remove: double(),
    suggest: double(),
    findSuggestions: double(),
    approve: double(),
    reject: double(),
  };
  const reader: jest.Mocked<ProfitabilityReaderPort> = {
    findActivity: jest.fn(),
    findLotDetail: jest.fn(),
  };
  const retry = { retry: jest.fn() };
  const market = {
    getSnapshot: jest.fn<
      ReturnType<MarketSnapshotPort['getSnapshot']>,
      Parameters<MarketSnapshotPort['getSnapshot']>
    >(),
  };

  const all = [
    ...Object.values(tariff),
    ...Object.values(category),
    ...Object.values(expense),
  ];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TariffModule,
        ExpenseCategoryModule,
        ExpenseModule,
        ProfitabilityModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(FindTariffsUseCase)
      .useValue(tariff.find)
      .overrideProvider(UpsertTariffUseCase)
      .useValue(tariff.upsert)
      .overrideProvider(DeleteTariffUseCase)
      .useValue(tariff.remove)
      .overrideProvider(GetTariffKgEquivalentsUseCase)
      .useValue(tariff.kg)
      .overrideProvider(FindAllExpenseCategoriesUseCase)
      .useValue(category.find)
      .overrideProvider(CreateExpenseCategoryUseCase)
      .useValue(category.create)
      .overrideProvider(UpdateExpenseCategoryUseCase)
      .useValue(category.update)
      .overrideProvider(DeleteExpenseCategoryUseCase)
      .useValue(category.remove)
      .overrideProvider(PreviewExpenseUseCase)
      .useValue(expense.preview)
      .overrideProvider(CreateExpenseUseCase)
      .useValue(expense.create)
      .overrideProvider(FindExpensesUseCase)
      .useValue(expense.find)
      .overrideProvider(UpdateExpenseUseCase)
      .useValue(expense.update)
      .overrideProvider(DeleteExpenseUseCase)
      .useValue(expense.remove)
      .overrideProvider(CreateExpenseSuggestionUseCase)
      .useValue(expense.suggest)
      .overrideProvider(FindExpenseSuggestionsUseCase)
      .useValue(expense.findSuggestions)
      .overrideProvider(ApproveExpenseSuggestionUseCase)
      .useValue(expense.approve)
      .overrideProvider(RejectExpenseSuggestionUseCase)
      .useValue(expense.reject)
      .overrideProvider(PROFITABILITY_READER)
      .useValue(reader)
      .overrideProvider(PENDING_VALUATION_RETRY)
      .useValue(retry)
      .overrideProvider(MARKET_SNAPSHOT)
      .useValue(market)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: Record<string, string>;
              user?: unknown;
            };
          };
        }) => {
          const req = context.switchToHttp().getRequest();
          if (req.headers.authorization !== 'Bearer finance-test') {
            throw new UnauthorizedException();
          }
          req.user = {
            id: 'user-1',
            tenantId: 'tenant-1',
            firmaId: 'company-1',
            role: req.headers['x-test-role'] ?? 'ADMIN',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as App;
  });

  beforeEach(() => {
    for (const item of all) item.execute.mockReset().mockResolvedValue({});
    reader.findActivity.mockReset().mockResolvedValue(emptyActivity);
    reader.findLotDetail.mockReset().mockResolvedValue(emptyDetail);
    retry.retry.mockReset().mockResolvedValue(undefined);
    market.getSnapshot.mockReset().mockResolvedValue(marketWith());
  });

  afterAll(async () => {
    await app?.close();
  });

  const as = (role: string) => ({
    Authorization: 'Bearer finance-test',
    'x-test-role': role,
  });

  describe('routes and roles', () => {
    type Verb = 'get' | 'post' | 'put' | 'patch' | 'delete';
    const routes: Array<[Verb, string, readonly string[]]> = [
      ['get', '/tariffs', ['ADMIN']],
      ['get', '/tariffs/kg-equivalents?grain=SOJA', ['ADMIN']],
      ['put', '/tariffs/labor-1', ['ADMIN']],
      ['delete', '/tariffs/labor-1', ['ADMIN']],
      ['get', '/expense-categories', ['ADMIN', 'SUPERVISOR']],
      ['post', '/expense-categories', ['ADMIN', 'SUPERVISOR']],
      ['patch', '/expense-categories/cat-1', ['ADMIN', 'SUPERVISOR']],
      ['delete', '/expense-categories/cat-1', ['ADMIN', 'SUPERVISOR']],
      ['post', '/expenses/preview', ['ADMIN', 'SUPERVISOR']],
      ['get', '/expenses', ['ADMIN', 'SUPERVISOR']],
      ['post', '/expenses', ['ADMIN', 'SUPERVISOR']],
      ['patch', '/expenses/exp-1', ['ADMIN']],
      ['delete', '/expenses/exp-1', ['ADMIN']],
      ['post', '/expenses/exp-1/suggestions', ['SUPERVISOR']],
      ['get', '/expense-suggestions', ['ADMIN', 'SUPERVISOR']],
      ['post', '/expense-suggestions/sug-1/approve', ['ADMIN']],
      ['post', '/expense-suggestions/sug-1/reject', ['ADMIN']],
      ['get', '/profitability/lots', ['ADMIN']],
      ['get', '/profitability/lots/lot-1', ['ADMIN']],
    ];

    it.each(routes)(
      '%s %s allows only %j and answers 401 without a token',
      async (verb, path, allowed) => {
        await request(server)[verb](path).expect(401);

        for (const role of ROLES) {
          const response = await request(server)
            [verb](path)
            .set(as(role))
            .send({});
          if (allowed.includes(role)) {
            expect([200, 201]).toContain(response.status);
          } else {
            expect(response.status).toBe(403);
          }
        }
      },
    );

    it('never reaches a use case when the role is refused', async () => {
      await request(server).get('/tariffs').set(as('SUPERVISOR')).expect(403);
      await request(server)
        .get('/profitability/lots')
        .set(as('OPERARIO'))
        .expect(403);
      await request(server)
        .get('/profitability/lots/lot-1')
        .set(as('SUPERVISOR'))
        .expect(403);

      expect(tariff.find.execute).not.toHaveBeenCalled();
      expect(retry.retry).not.toHaveBeenCalled();
      expect(reader.findActivity).not.toHaveBeenCalled();
      expect(reader.findLotDetail).not.toHaveBeenCalled();
    });
  });

  describe('error translation', () => {
    it.each([
      [
        '400 tariff input',
        'put',
        '/tariffs/l1',
        'ADMIN',
        tariff.upsert,
        new TariffInvalidInputError('x'),
        400,
      ],
      [
        '404 tariff',
        'delete',
        '/tariffs/l1',
        'ADMIN',
        tariff.remove,
        new TariffNotFoundError('x'),
        404,
      ],
      [
        '503 tariff market',
        'put',
        '/tariffs/l1',
        'ADMIN',
        tariff.upsert,
        new MarketUnavailableError(),
        503,
      ],
      [
        '400 category input',
        'post',
        '/expense-categories',
        'SUPERVISOR',
        category.create,
        new CategoryInvalidInputError('x'),
        400,
      ],
      [
        '409 category duplicate',
        'post',
        '/expense-categories',
        'ADMIN',
        category.create,
        new CategoryDuplicateError('x'),
        409,
      ],
      [
        '404 category',
        'patch',
        '/expense-categories/c1',
        'ADMIN',
        category.update,
        new CategoryNotFoundError('x'),
        404,
      ],
      [
        '409 category in use',
        'delete',
        '/expense-categories/c1',
        'ADMIN',
        category.remove,
        new CategoryInUseError('x'),
        409,
      ],
      [
        '400 expense input',
        'post',
        '/expenses',
        'SUPERVISOR',
        expense.create,
        new ExpenseInvalidInputError('x'),
        400,
      ],
      [
        '404 expense lot',
        'post',
        '/expenses',
        'ADMIN',
        expense.create,
        new ExpenseNotFoundError('x'),
        404,
      ],
      [
        '503 expense market',
        'post',
        '/expenses',
        'ADMIN',
        expense.create,
        new MarketUnavailableError(),
        503,
      ],
      [
        '409 expense pending suggestion',
        'patch',
        '/expenses/e1',
        'ADMIN',
        expense.update,
        new PendingSuggestionError('x'),
        409,
      ],
      [
        '409 expense concurrent edit',
        'delete',
        '/expenses/e1',
        'ADMIN',
        expense.remove,
        new ConcurrentModificationError('x'),
        409,
      ],
      [
        '409 suggestion already pending',
        'post',
        '/expenses/e1/suggestions',
        'SUPERVISOR',
        expense.suggest,
        new PendingSuggestionError('x'),
        409,
      ],
      [
        '404 suggestion',
        'post',
        '/expense-suggestions/s1/approve',
        'ADMIN',
        expense.approve,
        new ExpenseNotFoundError('x'),
        404,
      ],
      [
        '409 suggestion resolved',
        'post',
        '/expense-suggestions/s1/approve',
        'ADMIN',
        expense.approve,
        new SuggestionAlreadyResolvedError('x'),
        409,
      ],
      [
        '400 reject without reason',
        'post',
        '/expense-suggestions/s1/reject',
        'ADMIN',
        expense.reject,
        new ExpenseInvalidInputError('x'),
        400,
      ],
    ] as const)(
      '%s',
      async (_name, verb, path, role, useCase, error, status) => {
        useCase.execute.mockRejectedValue(error);

        await request(server)[verb](path).set(as(role)).send({}).expect(status);
      },
    );
  });

  describe('calculator (real use cases over doubled ports)', () => {
    const kgIncome = {
      lots: [lot1],
      entries: [
        {
          lotId: 'lot-1',
          kind: 'INCOME' as const,
          native: {
            amount: Dec.parse('600'),
            unit: 'KG_CEREAL' as const,
            grain: 'SOJA' as const,
          },
          arsAtApproval: Dec.parse('186000'),
        },
        {
          lotId: 'lot-1',
          kind: 'STANDARD_COST' as const,
          native: {
            amount: Dec.parse('48000'),
            unit: 'ARS' as const,
            grain: null,
          },
          arsAtApproval: Dec.parse('48000'),
        },
      ],
      pending: [{ lotId: 'lot-1', reports: 3, hectares: Dec.parse('120') }],
    };

    it('lists the lots of the session firm: retries pending first and reads with the token firm', async () => {
      reader.findActivity.mockResolvedValue(kgIncome);

      const response = await request(server)
        .get('/profitability/lots?campaign=2025/26&mode=AL_APROBAR')
        .set(as('ADMIN'))
        .expect(200);

      expect(retry.retry).toHaveBeenCalledWith('company-1');
      expect(reader.findActivity).toHaveBeenCalledWith({
        companyId: 'company-1',
        tenantId: 'tenant-1',
        range: { from: '2025-07-01', to: '2026-06-30' },
      });
      expect(response.body as ApiBody).toMatchObject({
        mode: 'AL_APROBAR',
        range: { campaign: '2025/26', from: '2025-07-01', to: '2026-06-30' },
        pending: { reports: 3, hectares: '120.0000' },
        valuation: { usdRateType: null, priceDate: null },
      });
      expect((response.body as ApiBody).lots[0]).toMatchObject({
        lotId: 'lot-1',
        incomeArs: '186000.00',
        costArs: '48000.00',
        marginArs: '138000.00',
      });
      expect(market.getSnapshot).not.toHaveBeenCalled();
    });

    it('ignores a companyId in the query: the firm is the one of the token', async () => {
      await request(server)
        .get('/profitability/lots?companyId=company-9&tenantId=tenant-9')
        .set(as('ADMIN'))
        .expect(200);

      expect(retry.retry).toHaveBeenCalledWith('company-1');
      expect(reader.findActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
          tenantId: 'tenant-1',
        }),
      );
      expect(JSON.stringify(reader.findActivity.mock.calls)).not.toContain(
        'company-9',
      );
    });

    it('re-prices in A_VALOR_HOY with one market photo', async () => {
      reader.findActivity.mockResolvedValue(kgIncome);

      const response = await request(server)
        .get('/profitability/lots?campaign=2025/26&mode=A_VALOR_HOY')
        .set(as('ADMIN'))
        .expect(200);

      // 600 kg x 330000 ARS/t = 198000 (186000 at approval); the ARS cost is unchanged.
      expect((response.body as ApiBody).lots[0].incomeArs).toBe('198000.00');
      expect((response.body as ApiBody).lots[0].standardCostArs).toBe(
        '48000.00',
      );
      expect(market.getSnapshot).toHaveBeenCalledTimes(1);
      expect((response.body as ApiBody).valuation.priceDate).toBe(
        '2026-11-23T11:55:00.000Z',
      );
    });

    it('answers 400 to an invalid campaign, an inverted range and an unknown mode', async () => {
      for (const query of [
        'campaign=2025/28',
        'from=2026-03-31&to=2026-01-01',
        'from=2026-01-01',
        'campaign=2025/26&from=2026-01-01&to=2026-03-31',
        'mode=HOY',
        'campaign=2025/26&campaign=2024/25',
      ]) {
        await request(server)
          .get(`/profitability/lots?${query}`)
          .set(as('ADMIN'))
          .expect(400);
      }
      expect(reader.findActivity).not.toHaveBeenCalled();
    });

    it('answers 503 in A_VALOR_HOY when a price is missing, and keeps AL_APROBAR working', async () => {
      reader.findActivity.mockResolvedValue(kgIncome);
      market.getSnapshot.mockResolvedValue(
        marketWith({ grainArsPerTon: { SOJA: null } }),
      );

      const failure = await request(server)
        .get('/profitability/lots?campaign=2025/26&mode=A_VALOR_HOY')
        .set(as('ADMIN'))
        .expect(503);
      expect((failure.body as ApiBody).message).toContain('precio');

      await request(server)
        .get('/profitability/lots?campaign=2025/26&mode=AL_APROBAR')
        .set(as('ADMIN'))
        .expect(200);
    });

    it('answers the detail of a lot and 404 for a lot outside the tenant', async () => {
      const response = await request(server)
        .get('/profitability/lots/lot-1?campaign=2025/26')
        .set(as('ADMIN'))
        .expect(200);

      expect(reader.findLotDetail).toHaveBeenCalledWith({
        companyId: 'company-1',
        tenantId: 'tenant-1',
        lotId: 'lot-1',
        range: { from: '2025-07-01', to: '2026-06-30' },
      });
      expect((response.body as ApiBody).lot.lotId).toBe('lot-1');
      expect((response.body as ApiBody).reports).toEqual([]);

      reader.findLotDetail.mockResolvedValue(null);
      await request(server)
        .get('/profitability/lots/other-tenant-lot')
        .set(as('ADMIN'))
        .expect(404);
    });
  });
});
