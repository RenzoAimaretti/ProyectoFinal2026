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
import { GetGrainPricesUseCase } from '../../application/use-cases/get-grain-prices.use-case';
import { GrainPriceController } from './grain-price.controller';

const grainPricesOutput = {
  source: 'cac.bcr.com.ar' as const,
  date: '2026-10-14',
  publishedAt: '2026-10-15T10:16:00-03:00',
  bnaRate: 1504,
  prices: [
    {
      grain: 'trigo' as const,
      label: 'Trigo',
      pricePerTonArs: 346000,
      pricePerTonUsd: 230.05,
    },
  ],
  stale: false,
  fetchedAt: '2026-10-15T15:00:00.000Z',
};

describe('GrainPriceController', () => {
  let controller: GrainPriceController;
  let getGrainPrices: jest.Mocked<GetGrainPricesUseCase>;

  beforeEach(() => {
    getGrainPrices = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetGrainPricesUseCase>;
    controller = new GrainPriceController(getGrainPrices);
  });

  it('protects the route with JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      GrainPriceController.prototype.findAll,
    ) as Array<new (...args: never[]) => unknown> | undefined;

    expect(guards).toContain(JwtAuthGuard);
  });

  it('exposes the global pizarra without any tenant scope', async () => {
    getGrainPrices.execute.mockResolvedValue(grainPricesOutput);

    await expect(controller.findAll()).resolves.toEqual(grainPricesOutput);
    expect(getGrainPrices.execute).toHaveBeenCalledWith();
  });

  it('maps domain errors to HTTP exceptions', async () => {
    getGrainPrices.execute.mockRejectedValueOnce(
      new InvalidInputError('bad input'),
    );
    await expect(controller.findAll()).rejects.toThrow(BadRequestException);

    getGrainPrices.execute.mockRejectedValueOnce(
      new EntityNotFoundError('not found'),
    );
    await expect(controller.findAll()).rejects.toThrow(NotFoundException);

    getGrainPrices.execute.mockRejectedValueOnce(
      new UpstreamUnavailableError('provider unreachable'),
    );
    await expect(controller.findAll()).rejects.toThrow(
      ServiceUnavailableException,
    );

    getGrainPrices.execute.mockRejectedValueOnce(
      new UpstreamParseError('no grain rows recognized'),
    );
    await expect(controller.findAll()).rejects.toThrow(BadGatewayException);

    getGrainPrices.execute.mockRejectedValueOnce(
      new UpstreamError(500, 'https://www.cac.bcr.com.ar/es/precios-de-pizarra'),
    );
    await expect(controller.findAll()).rejects.toThrow(BadGatewayException);
  });
});
