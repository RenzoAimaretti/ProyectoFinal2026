import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { translateIntegrationError } from '../../../shared/adapters/inbound/integration-http-errors';
import { GetUsdOfficialUseCase } from '../../application/use-cases/get-usd-official.use-case';

/** Dato de mercado global: exige JWT pero no se scopea por tenant (design §2.9). */
@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly getUsdOfficial: GetUsdOfficialUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Get('usd')
  async usd() {
    try {
      return await this.getUsdOfficial.execute();
    } catch (error) {
      translateIntegrationError(error);
    }
  }
}
