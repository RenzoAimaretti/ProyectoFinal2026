import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
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
import { GetLotProfitabilityDetailUseCase } from '../../application/use-cases/get-lot-profitability-detail.use-case';
import { GetLotProfitabilityListUseCase } from '../../application/use-cases/get-lot-profitability-list.use-case';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';

interface ProfitabilityRequestUser {
  id: string;
  tenantId: string;
  firmaId: string;
}

interface RequestWithUser {
  user: ProfitabilityRequestUser;
}

/**
 * Filters of the calculator. The firm is NEVER read from here: a `companyId`
 * (or `tenantId`) in the query is ignored, only the token decides.
 */
interface ProfitabilityQuery {
  campaign?: string;
  from?: string;
  to?: string;
  mode?: string;
}

const MARKET_UNAVAILABLE_MESSAGE =
  'El precio de mercado de hoy no está disponible. Probá con "Al aprobar" o reintentá en unos minutos.';

/**
 * Calculator: exclusive to ADMIN. It exposes the firm's financial data, so the
 * firm comes only from `req.user.firmaId` and the tenant from `req.user.tenantId`.
 */
@Controller('profitability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ProfitabilityController {
  constructor(
    private readonly listLots: GetLotProfitabilityListUseCase,
    private readonly lotDetail: GetLotProfitabilityDetailUseCase,
  ) {}

  @Get('lots')
  findLots(@Req() req: RequestWithUser, @Query() query: ProfitabilityQuery) {
    return this.handle(() =>
      this.listLots.execute({
        companyId: req.user.firmaId,
        tenantId: req.user.tenantId,
        ...filtersOf(query),
      }),
    );
  }

  @Get('lots/:lotId')
  findLotDetail(
    @Req() req: RequestWithUser,
    @Param('lotId') lotId: string,
    @Query() query: ProfitabilityQuery,
  ) {
    return this.handle(() =>
      this.lotDetail.execute({
        companyId: req.user.firmaId,
        tenantId: req.user.tenantId,
        lotId,
        ...filtersOf(query),
      }),
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
      if (error instanceof MarketUnavailableError)
        throw new ServiceUnavailableException(MARKET_UNAVAILABLE_MESSAGE);
      // Upstream errors: generic message to the client, detail only in the log.
      return translateIntegrationError(error);
    }
  }
}

function filtersOf(query: ProfitabilityQuery | undefined) {
  return {
    campaign: textOf('campaign', query?.campaign),
    from: textOf('from', query?.from),
    to: textOf('to', query?.to),
    mode: textOf('mode', query?.mode),
  };
}

/** A repeated query parameter arrives as an array: that is a malformed request. */
function textOf(name: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException(`El filtro "${name}" es inválido`);
  }
  return value;
}
