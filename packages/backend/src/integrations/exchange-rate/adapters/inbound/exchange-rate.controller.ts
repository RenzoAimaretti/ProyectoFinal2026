import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
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
