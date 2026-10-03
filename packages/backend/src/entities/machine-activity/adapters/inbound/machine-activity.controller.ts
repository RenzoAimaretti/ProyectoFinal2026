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
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { RegisterMachineActivityInput } from '../../application/machine-activity.types';
import { FindAllMachineActivitiesUseCase } from '../../application/use-cases/find-all-machine-activities.use-case';
import { FindMachineActivityUseCase } from '../../application/use-cases/find-machine-activity.use-case';
import { RegisterMachineActivityUseCase } from '../../application/use-cases/register-machine-activity.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';

type RequestWithUser = {
  user: {
    firmaId: string;
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
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() body: RegisterMachineActivityInput,
  ) {
    try {
      return await this.registerMachineActivity.execute(req.user.firmaId, body);
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
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
