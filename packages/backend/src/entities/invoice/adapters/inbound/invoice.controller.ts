import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { CreateInvoiceUseCase } from '../../application/use-cases/create-invoice.use-case';
import { FindInvoiceUseCase } from '../../application/use-cases/find-invoice.use-case';
import { ListInvoicesUseCase } from '../../application/use-cases/list-invoices.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

type RequestWithUser = { user: { firmaId: string; tenantId: string } };

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(
    private readonly createInvoice: CreateInvoiceUseCase,
    private readonly findInvoice: FindInvoiceUseCase,
    private readonly listInvoices: ListInvoicesUseCase,
  ) {}

  // Only ADMIN/SUPERVISOR manage accounting; operators and clients cannot issue invoices.
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: CreateInvoiceDto) {
    try {
      return await this.createInvoice.execute(
        req.user.firmaId,
        req.user.tenantId,
        body,
      );
    } catch (error) {
      this.translate(error);
    }
  }

  // Accounting reads share the same administrative roles and are always firm-scoped.
  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  async findAll(@Req() req: RequestWithUser) {
    try {
      return await this.listInvoices.execute(req.user.firmaId);
    } catch (error) {
      this.translate(error);
    }
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findInvoice.execute(id, req.user.firmaId);
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
      error instanceof InvalidRelationError
    )
      throw new BadRequestException(error.message);
    throw error;
  }
}
