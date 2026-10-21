import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { FindPendingPrescriptionsUseCase } from '../../application/use-cases/find-pending-prescriptions.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  PrescriptionFrozenError,
} from '../../domain/errors';

type RequestWithUser = {
  user: {
    tenantId: string;
  };
};

/**
 * HTTP inbound adapter for the agronomist prescription inbox. Reads are scoped
 * to the authenticated tenant through the `task -> lot -> farm -> client` chain
 * owned by the outbound adapter.
 *
 * The controller is thin: it delegates to the use case and translates
 * application errors to HTTP. No business logic and no Prisma.
 */
@Controller('prescriptions')
export class PrescriptionController {
  constructor(
    private readonly findPendingUseCase: FindPendingPrescriptionsUseCase,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INGENIERO', 'ADMIN', 'SUPERVISOR')
  @Get('pending')
  async findPending(@Req() req: RequestWithUser) {
    try {
      return await this.findPendingUseCase.execute(req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (
      error instanceof PrescriptionFrozenError ||
      error instanceof DuplicateEntityError
    ) {
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
