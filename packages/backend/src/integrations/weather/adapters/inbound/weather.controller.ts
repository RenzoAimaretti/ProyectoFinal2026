import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { translateIntegrationError } from '../../../shared/adapters/inbound/integration-http-errors';
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
      translateIntegrationError(error);
    }
  }
}
