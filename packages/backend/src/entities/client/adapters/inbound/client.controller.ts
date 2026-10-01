import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { FindAllClientsUseCase } from '../../application/use-cases/find-all-clients.use-case';
import { FindClientUseCase } from '../../application/use-cases/find-client.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';

type RequestWithUser = {
  user: {
    tenantId: string;
  };
};

/**
 * Read-only HTTP adapter for clients. Both use cases are tenant-scoped:
 * `FindAllClientsUseCase` lists the clients of `tenantId` and
 * `FindClientUseCase` resolves a single client only inside that tenant.
 */
@Controller('clients')
export class ClientController {
  constructor(
    private readonly findAllClients: FindAllClientsUseCase,
    private readonly findClient: FindClientUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req: RequestWithUser) {
    try {
      return await this.findAllClients.execute(req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findClient.execute(id, req.user.tenantId);
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

    throw error;
  }
}
