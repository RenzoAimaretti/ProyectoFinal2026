import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { ConciliateEcheqUseCase } from '../../application/use-cases/conciliate-echeq.use-case';
import { CreateEcheqUseCase } from '../../application/use-cases/create-echeq.use-case';
import { FindEcheqUseCase } from '../../application/use-cases/find-echeq.use-case';
import { ListEcheqsUseCase } from '../../application/use-cases/list-echeqs.use-case';
import { ListPendingEcheqsUseCase } from '../../application/use-cases/list-pending-echeqs.use-case';
import { RejectEcheqUseCase } from '../../application/use-cases/reject-echeq.use-case';
import { EcheqStatus } from '../../domain/echeq.rules';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import { CreateEcheqDto } from './dto/create-echeq.dto';

type RequestWithUser = { user: { firmaId: string; tenantId: string } };

@Controller('echeqs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EcheqController {
  constructor(
    private readonly createEcheq: CreateEcheqUseCase,
    private readonly findEcheq: FindEcheqUseCase,
    private readonly listEcheqs: ListEcheqsUseCase,
    private readonly pendingEcheqs: ListPendingEcheqsUseCase,
    private readonly conciliateEcheq: ConciliateEcheqUseCase,
    private readonly rejectEcheq: RejectEcheqUseCase,
  ) {}

  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: CreateEcheqDto) {
    try {
      return await this.createEcheq.execute(req.user.firmaId, body);
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('status') status?: EcheqStatus,
  ) {
    try {
      return await this.listEcheqs.execute(req.user.firmaId, status);
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get('pending')
  async pending(@Req() req: RequestWithUser) {
    try {
      return await this.pendingEcheqs.execute(req.user.firmaId);
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findEcheq.execute(id, req.user.firmaId);
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id/conciliate')
  async conciliate(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: { status: EcheqStatus; settlementDate: string },
  ) {
    try {
      return await this.conciliateEcheq.execute(
        req.user.firmaId,
        id,
        body?.status,
        body?.settlementDate,
      );
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: { notes?: string | null },
  ) {
    try {
      return await this.rejectEcheq.execute(req.user.firmaId, id, body?.notes);
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError)
      throw new NotFoundException(error.message);
    if (
      error instanceof DuplicateEntityError ||
      error instanceof InvalidStateTransitionError
    )
      throw new ConflictException(error.message);
    if (
      error instanceof InvalidInputError ||
      error instanceof InvalidRelationError
    )
      throw new BadRequestException(error.message);
    throw error;
  }
}
