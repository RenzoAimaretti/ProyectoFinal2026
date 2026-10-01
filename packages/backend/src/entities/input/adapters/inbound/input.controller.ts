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
import { CreateInputInput, UpdateInputInput } from '../../application/input.types';
import { CreateInputUseCase } from '../../application/use-cases/create-input.use-case';
import { FindAllInputsUseCase } from '../../application/use-cases/find-all-inputs.use-case';
import { FindInputUseCase } from '../../application/use-cases/find-input.use-case';
import { UpdateInputUseCase } from '../../application/use-cases/update-input.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';

type RequestWithUser = {
  user: {
    tenantId: string;
  };
};

@Controller('inputs')
export class InputController {
  constructor(
    private readonly findAllInputs: FindAllInputsUseCase,
    private readonly findInput: FindInputUseCase,
    private readonly createInput: CreateInputUseCase,
    private readonly updateInput: UpdateInputUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req: RequestWithUser) {
    try {
      return await this.findAllInputs.execute(req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findInput.execute(id, req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: CreateInputInput) {
    try {
      return await this.createInput.execute(req.user.tenantId, {
        name: body.name,
        unit: body.unit,
      });
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateInputInput,
  ) {
    try {
      return await this.updateInput.execute(id, req.user.tenantId, {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.unit !== undefined ? { unit: body.unit } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      });
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
