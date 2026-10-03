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
import { ListEntityPhotosUseCase } from '../../../photo/application/use-cases/list-entity-photos.use-case';
import {
  CreateDailyReportInput,
  CreateDailyReportItemInput,
} from '../../application/daily-report.types';
import { ApproveDailyReportUseCase } from '../../application/use-cases/approve-daily-report.use-case';
import { CreateDailyReportUseCase } from '../../application/use-cases/create-daily-report.use-case';
import { FindDailyReportUseCase } from '../../application/use-cases/find-daily-report.use-case';
import { FindDailyReportsByCompanyUseCase } from '../../application/use-cases/find-daily-reports-by-company.use-case';
import { RejectDailyReportUseCase } from '../../application/use-cases/reject-daily-report.use-case';
import {
  EntityNotFoundError,
  InsufficientStockError,
  InvalidInputError,
  InvalidRelationError,
  InvalidStateTransitionError,
} from '../../domain/errors';

type RequestWithUser = {
  user: {
    id: string;
    tenantId: string;
    firmaId: string;
  };
};

type DailyReportBody = {
  id?: string;
  taskId: string;
  date: string;
  hectares: number;
  hours: number;
  items: CreateDailyReportItemInput[];
};

type RejectDailyReportBody = {
  reason?: string;
};

@Controller('daily-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
export class DailyReportController {
  constructor(
    private readonly createDailyReport: CreateDailyReportUseCase,
    private readonly findDailyReport: FindDailyReportUseCase,
    private readonly findByCompany: FindDailyReportsByCompanyUseCase,
    private readonly approveDailyReport: ApproveDailyReportUseCase,
    private readonly rejectDailyReport: RejectDailyReportUseCase,
    private readonly listEntityPhotos: ListEntityPhotosUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: DailyReportBody) {
    const companyId = req.user.firmaId;
    const operatorId = req.user.id;

    const input: CreateDailyReportInput = {
      id: body.id,
      operatorId,
      taskId: body.taskId,
      date: body.date,
      hectares: body.hectares,
      hours: body.hours,
      items: body.items,
    };

    try {
      return await this.createDailyReport.execute(companyId, input);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new NotFoundException(error.message);
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

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAllByCompany(@Req() req: RequestWithUser) {
    const companyId = req.user.firmaId;

    return this.findByCompany.execute(companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const companyId = req.user.firmaId;

    try {
      return await this.findDailyReport.execute(id, companyId);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new NotFoundException(error.message);
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

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Req() req: RequestWithUser) {
    const companyId = req.user.firmaId;
    const approvedBy = req.user.id;

    try {
      return await this.approveDailyReport.execute(companyId, id, approvedBy);
    } catch (error) {
      this.translateDecisionError(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: RejectDailyReportBody,
  ) {
    const companyId = req.user.firmaId;

    try {
      return await this.rejectDailyReport.execute(companyId, id, body?.reason as string);
    } catch (error) {
      this.translateDecisionError(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/photos')
  async findPhotos(@Param('id') id: string, @Req() req: RequestWithUser) {
    const companyId = req.user.firmaId;

    try {
      await this.findDailyReport.execute(id, companyId);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }

    return this.listEntityPhotos.execute('PARTE_DIARIO', id);
  }

  /**
   * Uniform translation of decision errors shared by approve and reject. The
   * stock shortage keeps its structured body so the client can explain which
   * input could not cover the consumed quantity.
   */
  private translateDecisionError(error: unknown): never {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof InsufficientStockError) {
      throw new ConflictException({
        statusCode: 409,
        code: 'INSUFFICIENT_STOCK',
        message: error.message,
        clientId: error.clientId,
        inputId: error.inputId,
        required: error.required,
        available: error.available,
      });
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
