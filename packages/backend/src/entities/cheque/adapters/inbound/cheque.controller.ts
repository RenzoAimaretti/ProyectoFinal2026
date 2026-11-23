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
import { ChangeChequeStatusUseCase } from '../../application/use-cases/change-cheque-status.use-case';
import { CreateChequeUseCase } from '../../application/use-cases/create-cheque.use-case';
import { FindChequeUseCase } from '../../application/use-cases/find-cheque.use-case';
import { ListChequesUseCase } from '../../application/use-cases/list-cheques.use-case';
import { ChequeStatus } from '../../domain/cheque-status';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import { CreateChequeDto } from './dto/create-cheque.dto';

type RequestWithUser = { user: { firmaId: string; tenantId: string } };

@Controller('cheques')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChequeController {
  constructor(
    private readonly createCheque: CreateChequeUseCase,
    private readonly findCheque: FindChequeUseCase,
    private readonly listCheques: ListChequesUseCase,
    private readonly changeChequeStatus: ChangeChequeStatusUseCase,
  ) {}

  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: CreateChequeDto) {
    try {
      return await this.createCheque.execute(req.user.firmaId, body);
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('status') status?: ChequeStatus,
  ) {
    try {
      return await this.listCheques.execute(req.user.firmaId, status);
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findCheque.execute(id, req.user.firmaId);
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: { status: ChequeStatus },
  ) {
    try {
      return await this.changeChequeStatus.execute(
        req.user.firmaId,
        id,
        body?.status,
      );
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError)
      throw new NotFoundException(error.message);
    if (error instanceof DuplicateEntityError)
      throw new ConflictException(error.message);
    if (
      error instanceof InvalidInputError ||
      error instanceof InvalidRelationError ||
      error instanceof InvalidStateTransitionError
    )
      throw new BadRequestException(error.message);
    throw error;
  }
}
