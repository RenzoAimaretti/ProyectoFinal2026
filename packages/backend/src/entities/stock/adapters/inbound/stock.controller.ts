import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { FindStockBalanceUseCase } from '../../application/use-cases/find-stock-balance.use-case';
import { FindStockByClientUseCase } from '../../application/use-cases/find-stock-by-client.use-case';
import { InvalidInputError } from '../../domain/errors';
import {
  CLIENT_USER_READER,
  ClientUserReaderPort,
} from '../../../client/application/client.ports';

type RequestWithUser = {
  user: {
    id: string;
    role: string;
  };
};

/**
 * Read-only HTTP adapter for the client-scoped stock balance.
 *
 * Stock is always attributed to a client. A PRODUCTOR is forced to their own
 * linked client (the query parameter is ignored), while ADMIN/SUPERVISOR keep
 * the explicit `clientId` query behavior. The adapter never invents an
 * identity: a caller without an explicit scope gets a 400 from the use case.
 */
@Controller('stock')
export class StockController {
  constructor(
    private readonly findStockByClient: FindStockByClientUseCase,
    private readonly findStockBalance: FindStockBalanceUseCase,
    @Inject(CLIENT_USER_READER)
    private readonly clientUserReader: ClientUserReaderPort,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('clientId') clientId?: string,
  ) {
    const scope = await this.resolveScope(req, clientId);

    try {
      return await this.findStockByClient.execute(scope);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('balance')
  async findBalance(
    @Req() req: RequestWithUser,
    @Query('clientId') clientId?: string,
    @Query('inputId') inputId?: string,
  ) {
    const scope = await this.resolveScope(req, clientId);

    try {
      return await this.findStockBalance.execute(scope, inputId as string);
    } catch (error) {
      this.translate(error);
    }
  }

  private async resolveScope(
    req: RequestWithUser,
    clientId?: string,
  ): Promise<string> {
    if (req?.user?.role === 'PRODUCTOR') {
      const ownClientId = await this.clientUserReader.findClientIdByUserId(
        req.user.id,
      );

      if (!ownClientId) {
        throw new NotFoundException(
          'El usuario autenticado no está vinculado a un cliente',
        );
      }

      return ownClientId;
    }

    return clientId as string;
  }

  private translate(error: unknown): never {
    if (error instanceof InvalidInputError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
