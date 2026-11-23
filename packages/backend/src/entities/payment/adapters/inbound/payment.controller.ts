import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { CreatePaymentUseCase } from '../../application/use-cases/create-payment.use-case';
import { FindPaymentUseCase } from '../../application/use-cases/find-payment.use-case';
import { ListPaymentsUseCase } from '../../application/use-cases/list-payments.use-case';
import {
  CreatePaymentInput,
  PaymentKind,
} from '../../application/payment.types';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';

type RequestWithUser = { user: { firmaId: string; tenantId: string } };

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(
    private readonly createPayment: CreatePaymentUseCase,
    private readonly findPayment: FindPaymentUseCase,
    private readonly listPayments: ListPaymentsUseCase,
  ) {}

  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: CreatePaymentInput) {
    try {
      return await this.createPayment.execute(
        req.user.firmaId,
        req.user.tenantId,
        body,
      );
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('kind') kind?: PaymentKind,
  ) {
    try {
      return await this.listPayments.execute(req.user.firmaId, kind);
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findPayment.execute(id, req.user.firmaId);
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError)
      throw new NotFoundException(error.message);
    if (
      error instanceof InvalidInputError ||
      error instanceof InvalidRelationError
    )
      throw new BadRequestException(error.message);
    throw error;
  }
}
