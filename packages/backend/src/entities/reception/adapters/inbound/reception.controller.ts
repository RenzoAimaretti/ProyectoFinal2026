import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import {
  CreateReceptionInput,
  ReceptionItemValidation,
} from '../../application/reception.types';
import { CreateReceptionUseCase } from '../../application/use-cases/create-reception.use-case';
import { FindReceptionByTenantUseCase } from '../../application/use-cases/find-reception-by-tenant.use-case';
import { FindReceptionsByClientUseCase } from '../../application/use-cases/find-receptions-by-client.use-case';
import { FindReceptionsByTenantUseCase } from '../../application/use-cases/find-receptions-by-tenant.use-case';
import { RejectReceptionUseCase } from '../../application/use-cases/reject-reception.use-case';
import { ValidateReceptionUseCase } from '../../application/use-cases/validate-reception.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import {
  CLIENT_USER_READER,
  ClientUserReaderPort,
} from '../../../client/application/client.ports';

type RequestWithUser = {
  user: {
    id: string;
    role: string;
    tenantId: string;
    firmaId: string;
  };
};

type CreateReceptionBody = {
  clientId: string;
  date: string;
  items: CreateReceptionInput['items'];
};

type ValidateReceptionBody = {
  items: ReceptionItemValidation[];
};

type RejectReceptionBody = {
  reason?: string;
};

/**
 * HTTP inbound adapter for the reception hexagon.
 *
 * ADMIN/SUPERVISOR work at tenant level: reads are scoped by
 * `req.user.tenantId` and creation accepts the explicit `clientId`. A
 * PRODUCTOR is forced to their own linked client for both listing and
 * creation; the body `clientId` is ignored for them.
 */
@Controller('receptions')
export class ReceptionController {
  constructor(
    private readonly createReception: CreateReceptionUseCase,
    private readonly findReceptionsByTenant: FindReceptionsByTenantUseCase,
    private readonly findReceptionsByClient: FindReceptionsByClientUseCase,
    private readonly findReceptionByTenant: FindReceptionByTenantUseCase,
    private readonly validateReception: ValidateReceptionUseCase,
    private readonly rejectReception: RejectReceptionUseCase,
    @Inject(CLIENT_USER_READER)
    private readonly clientUserReader: ClientUserReaderPort,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async findAll(@Req() req: RequestWithUser) {
    try {
      if (req.user.role === 'PRODUCTOR') {
        const clientId = await this.resolveOwnClientId(req.user.id);
        return await this.findReceptionsByClient.execute(clientId);
      }

      return await this.findReceptionsByTenant.execute(req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findReceptionByTenant.execute(id, req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: CreateReceptionBody) {
    try {
      const clientId =
        req.user.role === 'PRODUCTOR'
          ? await this.resolveOwnClientId(req.user.id)
          : body.clientId;

      const created = await this.createReception.execute(clientId, {
        date: body.date,
        items: body.items,
      });

      // An ingreso registered by the administrator is already agreed, so it is
      // validated immediately with the declared quantities. Any other role
      // keeps the pending-validation flow untouched.
      if (req.user.role !== 'ADMIN') {
        return created;
      }

      return await this.validateReception.execute(
        created.clientId,
        created.id,
        req.user.id,
        created.items.map((item) => ({
          inputId: item.inputId,
          validatedQuantity: item.quantity,
        })),
      );
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post(':id/validate')
  async validate(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: ValidateReceptionBody,
  ) {
    try {
      const reception = await this.findReceptionByTenant.execute(
        id,
        req.user.tenantId,
      );

      return await this.validateReception.execute(
        reception.clientId,
        id,
        req.user.id,
        body.items,
      );
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: RejectReceptionBody,
  ) {
    try {
      const reception = await this.findReceptionByTenant.execute(
        id,
        req.user.tenantId,
      );

      return await this.rejectReception.execute(
        reception.clientId,
        id,
        body?.reason as string,
      );
    } catch (error) {
      this.translate(error);
    }
  }

  private async resolveOwnClientId(userId: string): Promise<string> {
    const clientId = await this.clientUserReader.findClientIdByUserId(userId);

    if (!clientId) {
      throw new NotFoundException(
        'El usuario autenticado no está vinculado a un cliente',
      );
    }

    return clientId;
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof InvalidStateTransitionError) {
      throw new ConflictException(error.message);
    }

    if (
      error instanceof InvalidInputError ||
      error instanceof InvalidRelationError
    ) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
