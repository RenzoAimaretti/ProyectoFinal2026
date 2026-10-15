import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import {
  EntityNotFoundError,
  InvalidInputError,
  UpstreamError,
  UpstreamParseError,
  UpstreamUnavailableError,
} from '../../../shared/domain/errors';
import { GetLotWeatherUseCase } from '../../application/use-cases/get-lot-weather.use-case';

type RequestWithUser = {
  user: {
    tenantId: string;
  };
};

/**
 * `@Controller('lots')` no colisiona con el `LotController` existente: las rutas
 * completas (`GET /lots/:lotId/weather` vs `GET /lots/:id`) son distintas.
 * El `tenantId` sale SIEMPRE del JWT, nunca del body/query (spec A9).
 */
@Controller('lots')
export class LotWeatherController {
  constructor(private readonly getLotWeather: GetLotWeatherUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Get(':lotId/weather')
  async findByLot(@Param('lotId') lotId: string, @Req() req: RequestWithUser) {
    try {
      return await this.getLotWeather.execute({
        lotId,
        tenantId: req.user.tenantId,
      });
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof InvalidInputError) {
      throw new BadRequestException(error.message);
    }

    if (error instanceof UpstreamUnavailableError) {
      throw new ServiceUnavailableException(error.message);
    }

    if (error instanceof UpstreamError || error instanceof UpstreamParseError) {
      throw new BadGatewayException(error.message);
    }

    throw error;
  }
}
