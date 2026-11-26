import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { translateIntegrationError } from '../../../../integrations/shared/adapters/inbound/integration-http-errors';
import { MarketUnavailableError } from '../../../valuation/domain/errors';
import { DeleteTariffUseCase } from '../../application/use-cases/delete-tariff.use-case';
import { FindTariffsUseCase } from '../../application/use-cases/find-tariffs.use-case';
import { GetTariffKgEquivalentsUseCase } from '../../application/use-cases/get-tariff-kg-equivalents.use-case';
import { UpsertTariffUseCase } from '../../application/use-cases/upsert-tariff.use-case';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';

interface TariffRequestUser {
  id: string;
  tenantId: string;
  firmaId: string;
}

interface RequestWithUser {
  user: TariffRequestUser;
}

/** Cuerpo de `PUT /tariffs/:laborTypeId`. La firma NUNCA se lee del cuerpo. */
interface TariffBody {
  price?: unknown;
  cost?: unknown;
}

interface KgEquivalentsQuery {
  grain?: string;
}

const MARKET_UNAVAILABLE_MESSAGE =
  'El precio de mercado no está disponible. Reintentá en unos minutos.';

/** Tarifario: exclusivo del ADMIN; la firma sale siempre de `req.user.firmaId`. */
@Controller('tariffs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TariffController {
  constructor(
    private readonly findTariffs: FindTariffsUseCase,
    private readonly upsertTariff: UpsertTariffUseCase,
    private readonly deleteTariff: DeleteTariffUseCase,
    private readonly kgEquivalentsOf: GetTariffKgEquivalentsUseCase,
  ) {}

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.handle(() =>
      this.findTariffs.execute({ companyId: req.user.firmaId }),
    );
  }

  // Declarada antes que cualquier ruta con parametro para que no se confunda con uno.
  @Get('kg-equivalents')
  kgEquivalents(
    @Req() req: RequestWithUser,
    @Query() query: KgEquivalentsQuery,
  ) {
    return this.handle(() =>
      this.kgEquivalentsOf.execute({
        companyId: req.user.firmaId,
        grain: query?.grain,
      }),
    );
  }

  @Put(':laborTypeId')
  upsert(
    @Param('laborTypeId') laborTypeId: string,
    @Req() req: RequestWithUser,
    @Body() body: TariffBody,
  ) {
    return this.handle(() =>
      this.upsertTariff.execute({
        companyId: req.user.firmaId,
        tenantId: req.user.tenantId,
        userId: req.user.id,
        laborTypeId,
        price: body?.price,
        cost: body?.cost,
      }),
    );
  }

  @Delete(':laborTypeId')
  remove(
    @Param('laborTypeId') laborTypeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.handle(() =>
      this.deleteTariff.execute({ companyId: req.user.firmaId, laborTypeId }),
    );
  }

  private async handle<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof EntityNotFoundError)
        throw new NotFoundException(error.message);
      if (error instanceof InvalidInputError)
        throw new BadRequestException(error.message);
      if (error instanceof MarketUnavailableError) {
        throw new ServiceUnavailableException(MARKET_UNAVAILABLE_MESSAGE);
      }
      // Errores upstream: mensaje generico al cliente, detalle solo en el log.
      return translateIntegrationError(error);
    }
  }
}
