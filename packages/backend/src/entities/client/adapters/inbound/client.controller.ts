import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { FindAllClientsUseCase } from '../../application/use-cases/find-all-clients.use-case';
import { FindClientUseCase } from '../../application/use-cases/find-client.use-case';
import { CreateClientWithAccessUseCase } from '../../application/use-cases/create-client-with-access.use-case';
import { FindClientProfileUseCase } from '../../application/use-cases/find-client-profile.use-case';
import { UpdateClientProfileUseCase } from '../../application/use-cases/update-client-profile.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { CreateClientWithAccessInput } from '../../application/client.types';

type RequestWithUser = {
  user: {
    id: string;
    tenantId: string;
    firmaId: string;
    role: string;
  };
};

type UpdateProfileBody = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  address?: string | null;
};

/**
 * HTTP adapter for clients.
 *
 * - Admin reads (`GET /clients`, `GET /clients/:id`) are tenant-scoped and
 *   restricted to ADMIN/SUPERVISOR.
 * - `POST /clients` creates the full client access bundle (client + productor
 *   user + membership + farm + lots) in a single transaction.
 * - `/clients/me` resolves the profile from the authenticated user's link.
 */
@Controller('clients')
export class ClientController {
  constructor(
    private readonly findAllClients: FindAllClientsUseCase,
    private readonly findClient: FindClientUseCase,
    private readonly createClientWithAccess: CreateClientWithAccessUseCase,
    private readonly findClientProfile: FindClientProfileUseCase,
    private readonly updateClientProfile: UpdateClientProfileUseCase,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  async findAll(@Req() req: RequestWithUser) {
    try {
      return await this.findAllClients.execute(req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('me')
  async findMe(@Req() req: RequestWithUser) {
    try {
      return await this.findClientProfile.execute(req.user.id);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('me')
  async updateMe(@Req() req: RequestWithUser, @Body() body: UpdateProfileBody) {
    try {
      return await this.updateClientProfile.execute(req.user.id, {
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
      });
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findClient.execute(id, req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() body: CreateClientWithAccessInput,
  ) {
    try {
      return await this.createClientWithAccess.execute(
        req.user.tenantId,
        req.user.firmaId,
        body,
      );
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof DuplicateEntityError) {
      throw new ConflictException(error.message);
    }

    if (error instanceof InvalidInputError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
