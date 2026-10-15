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
