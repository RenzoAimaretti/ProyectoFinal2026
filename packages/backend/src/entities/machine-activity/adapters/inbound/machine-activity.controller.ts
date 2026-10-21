import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { RegisterMachineActivityInput } from '../../application/machine-activity.types';
import { FindAllMachineActivitiesUseCase } from '../../application/use-cases/find-all-machine-activities.use-case';
import { FindMachineActivityUseCase } from '../../application/use-cases/find-machine-activity.use-case';
import { RegisterMachineActivityUseCase } from '../../application/use-cases/register-machine-activity.use-case';
import { AttachFuelReceiptUseCase } from '../../application/use-cases/attach-fuel-receipt.use-case';
import { ReadFuelReceiptUseCase } from '../../application/use-cases/read-fuel-receipt.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  ReceiptAlreadyAttachedError,
} from '../../domain/errors';

type RequestWithUser = {
  user: {
    firmaId: string;
    role: string;
  };
};

/**
 * HTTP inbound adapter for machine activities. The company that bears the cost
 * is resolved from `req.user.firmaId`, so a caller cannot register an activity
 * against another firm.
 */
@Controller('machine-activities')
export class MachineActivityController {
  constructor(
    private readonly findAllMachineActivities: FindAllMachineActivitiesUseCase,
    private readonly findMachineActivity: FindMachineActivityUseCase,
    private readonly registerMachineActivity: RegisterMachineActivityUseCase,
    private readonly attachFuelReceipt: AttachFuelReceiptUseCase,
    private readonly readFuelReceipt: ReadFuelReceiptUseCase,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get()
  async findAll(@Req() req: RequestWithUser) {
    try {
      return await this.findAllMachineActivities.execute(req.user.firmaId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findMachineActivity.execute(id, req.user.firmaId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() body: RegisterMachineActivityInput,
  ) {
    if (req.user.role === 'OPERARIO' && body.type !== 'COMBUSTIBLE') {
      throw new ForbiddenException('Only fuel activities may be registered by OPERARIO');
    }
    try {
      return await this.registerMachineActivity.execute(req.user.firmaId, body);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Post(':id/receipt')
  async attachReceipt(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: { dataUrl?: unknown },
  ) {
    try {
      await this.attachFuelReceipt.execute(id, req.user.firmaId, body?.dataUrl);
      return { attached: true };
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get(':id/receipt')
  async downloadReceipt(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    try {
      const receipt = await this.readFuelReceipt.execute(id, req.user.firmaId);
      response.setHeader('Content-Type', receipt.mimeType);
      response.setHeader('Content-Disposition', 'attachment; filename="fuel-receipt"');
      response.setHeader('Cache-Control', 'private, no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      return new StreamableFile(receipt.bytes);
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof ReceiptAlreadyAttachedError) {
      throw new ConflictException(error.message);
    }
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
