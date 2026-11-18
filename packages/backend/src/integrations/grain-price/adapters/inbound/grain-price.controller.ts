import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { translateIntegrationError } from '../../../shared/adapters/inbound/integration-http-errors';
import { GetGrainPricesUseCase } from '../../application/use-cases/get-grain-prices.use-case';

/** Dato de mercado global: exige JWT pero no se scopea por tenant (design §2.9). */
@Controller('grain-prices')
export class GrainPriceController {
  constructor(private readonly getGrainPrices: GetGrainPricesUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    try {
      return await this.getGrainPrices.execute();
    } catch (error) {
      translateIntegrationError(error);
    }
  }
}
