import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import {
  CreateDailyReportInput,
  CreateDailyReportItemInput,
} from '../../application/daily-report.types';
import { CreateDailyReportUseCase } from '../../application/use-cases/create-daily-report.use-case';
import { FindDailyReportUseCase } from '../../application/use-cases/find-daily-report.use-case';
import { FindDailyReportsByCompanyUseCase } from '../../application/use-cases/find-daily-reports-by-company.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
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

@Controller('daily-reports')
export class DailyReportController {
  constructor(
    private readonly createDailyReport: CreateDailyReportUseCase,
    private readonly findDailyReport: FindDailyReportUseCase,
    private readonly findByCompany: FindDailyReportsByCompanyUseCase,
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
}
