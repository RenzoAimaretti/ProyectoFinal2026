import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreateLivestockEventInput,
  UpdateLivestockEventInput,
} from './application/livestock-event.types';
import { LivestockEventService } from './livestock-event.service';

type RequestWithUser = {
  user: {
    firmaId: string;
  };
};

type CreateLivestockEventBody = Omit<CreateLivestockEventInput, 'companyId'> & {
  companyId?: string;
};

type UpdateLivestockEventBody = Omit<UpdateLivestockEventInput, 'companyId'> & {
  companyId?: string;
};

function hasUser(value: unknown): value is RequestWithUser {
  return Boolean(value && typeof value === 'object' && 'user' in value);
}

@Controller('livestock-events')
export class LivestockEventController {
  constructor(private readonly service: LivestockEventService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req?: RequestWithUser) {
    return hasUser(req)
      ? this.service.findAll(req.user.firmaId)
      : this.service.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req?: RequestWithUser) {
    return hasUser(req)
      ? this.service.findOne(id, req.user.firmaId)
      : this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() reqOrData?: RequestWithUser | CreateLivestockEventBody,
    @Body() data?: CreateLivestockEventBody,
  ) {
    const req = hasUser(reqOrData) ? reqOrData : undefined;
    const body = hasUser(reqOrData) ? data : reqOrData;
    const { companyId: _companyId, ...payload } = body ?? {};

    return req
      ? this.service.create(req.user.firmaId, payload as CreateLivestockEventInput)
      : this.service.create(payload as CreateLivestockEventInput);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() reqOrData?: RequestWithUser | UpdateLivestockEventBody,
    @Body() data?: UpdateLivestockEventBody,
  ) {
    const req = hasUser(reqOrData) ? reqOrData : undefined;
    const body = hasUser(reqOrData) ? data : reqOrData;
    const { companyId: _companyId, ...payload } = body ?? {};

    return req
      ? this.service.update(id, req.user.firmaId, payload as UpdateLivestockEventInput)
      : this.service.update(id, payload as UpdateLivestockEventInput);
  }
}
