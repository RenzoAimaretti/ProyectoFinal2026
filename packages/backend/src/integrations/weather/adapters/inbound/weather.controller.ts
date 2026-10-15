import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
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
import { GetWeatherUseCase } from '../../application/use-cases/get-weather.use-case';

@Controller('weather')
export class WeatherController {
  constructor(private readonly getWeather: GetWeatherUseCase) {}

  /** Solo se seleccionan `lat` y `lon`: cualquier extra del cliente se ignora. */
  @UseGuards(JwtAuthGuard)
  @Get('current')
  async current(@Query() query: Record<string, unknown>) {
    try {
      return await this.getWeather.execute({
        lat: query.lat as number,
        lon: query.lon as number,
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
