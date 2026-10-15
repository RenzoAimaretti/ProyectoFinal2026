import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import {
  EntityNotFoundError,
  InvalidInputError,
  UpstreamError,
  UpstreamParseError,
  UpstreamUnavailableError,
} from '../../../shared/domain/errors';
import { GetUsdOfficialUseCase } from '../../application/use-cases/get-usd-official.use-case';
import { ExchangeRateController } from './exchange-rate.controller';

const usdOutput = {
  source: 'dolarapi.com' as const,
  casa: 'oficial' as const,
  moneda: 'USD' as const,
  nombre: 'Oficial',
  compra: 1480,
  venta: 1530,
  fechaActualizacion: '2026-10-15T17:00:00.000Z',
  stale: false,
  fetchedAt: '2026-10-15T17:05:00.000Z',
};

describe('ExchangeRateController', () => {
  let controller: ExchangeRateController;
  let getUsdOfficial: jest.Mocked<GetUsdOfficialUseCase>;

  beforeEach(() => {
    getUsdOfficial = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetUsdOfficialUseCase>;
    controller = new ExchangeRateController(getUsdOfficial);
  });

  it('protects the route with JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ExchangeRateController.prototype.usd,
    ) as Array<new (...args: never[]) => unknown> | undefined;

    expect(guards).toContain(JwtAuthGuard);
  });

  it('exposes the global official rate without any tenant scope', async () => {
    getUsdOfficial.execute.mockResolvedValue(usdOutput);

    await expect(controller.usd()).resolves.toEqual(usdOutput);
    expect(getUsdOfficial.execute).toHaveBeenCalledWith();
  });

  it('maps domain errors to HTTP exceptions', async () => {
    getUsdOfficial.execute.mockRejectedValueOnce(
      new InvalidInputError('bad input'),
    );
    await expect(controller.usd()).rejects.toThrow(BadRequestException);

    getUsdOfficial.execute.mockRejectedValueOnce(
      new EntityNotFoundError('not found'),
    );
    await expect(controller.usd()).rejects.toThrow(NotFoundException);

    getUsdOfficial.execute.mockRejectedValueOnce(
      new UpstreamUnavailableError('provider unreachable'),
    );
    await expect(controller.usd()).rejects.toThrow(
      ServiceUnavailableException,
    );

    getUsdOfficial.execute.mockRejectedValueOnce(
      new UpstreamParseError('payload is missing the buy price'),
    );
    await expect(controller.usd()).rejects.toThrow(BadGatewayException);

    getUsdOfficial.execute.mockRejectedValueOnce(
      new UpstreamError(500, 'https://dolarapi.com/v1/dolares/oficial'),
    );
    await expect(controller.usd()).rejects.toThrow(BadGatewayException);
  });
});
