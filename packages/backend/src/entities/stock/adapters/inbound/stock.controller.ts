import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { FindStockBalanceUseCase } from '../../application/use-cases/find-stock-balance.use-case';
import { FindStockByClientUseCase } from '../../application/use-cases/find-stock-by-client.use-case';
import { InvalidInputError } from '../../domain/errors';

/**
 * Read-only HTTP adapter for the client-scoped stock balance.
 *
 * Stock is always attributed to a client, and the JWT carries the tenant (the
 * subscribed company), not an individual client. There is no reliable
 * user-to-client mapping, so the adapter never invents one: the caller must
 * supply an explicit `clientId` query parameter and the use case rejects a
 * missing or blank value with 400.
 */
@Controller('stock')
export class StockController {
  constructor(
    private readonly findStockByClient: FindStockByClientUseCase,
    private readonly findStockBalance: FindStockBalanceUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query('clientId') clientId?: string) {
    try {
      return await this.findStockByClient.execute(clientId as string);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  async findBalance(
    @Query('clientId') clientId?: string,
    @Query('inputId') inputId?: string,
  ) {
    try {
      return await this.findStockBalance.execute(
        clientId as string,
        inputId as string,
      );
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof InvalidInputError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
