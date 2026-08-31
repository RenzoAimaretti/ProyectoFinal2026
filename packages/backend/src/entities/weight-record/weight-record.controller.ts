import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreateWeightRecordInput,
  UpdateWeightRecordInput,
} from './application/weight-record.types';
import { WeightRecordService } from './weight-record.service';

type RequestWithUser = {
  user: {
    firmaId: string;
  };
};

type CreateWeightRecordBody = Omit<CreateWeightRecordInput, 'companyId'> & {
  companyId?: string;
};

type UpdateWeightRecordBody = Omit<UpdateWeightRecordInput, 'companyId'> & {
  companyId?: string;
};

function hasUser(value: unknown): value is RequestWithUser {
  return Boolean(value && typeof value === 'object' && 'user' in value);
}

@Controller('weight-records')
export class WeightRecordController {
  constructor(private readonly service: WeightRecordService) {}

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
    @Req() reqOrData?: RequestWithUser | CreateWeightRecordBody,
    @Body() data?: CreateWeightRecordBody,
  ) {
    const req = hasUser(reqOrData) ? reqOrData : undefined;
    const body = hasUser(reqOrData) ? data : reqOrData;
    const { companyId: _companyId, ...payload } = body ?? {};

    return req
      ? this.service.create(req.user.firmaId, payload as CreateWeightRecordInput)
      : this.service.create(payload as CreateWeightRecordInput);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() reqOrData?: RequestWithUser | UpdateWeightRecordBody,
    @Body() data?: UpdateWeightRecordBody,
  ) {
    const req = hasUser(reqOrData) ? reqOrData : undefined;
    const body = hasUser(reqOrData) ? data : reqOrData;
    const { companyId: _companyId, ...payload } = body ?? {};

    return req
      ? this.service.update(id, req.user.firmaId, payload as UpdateWeightRecordInput)
      : this.service.update(id, payload as UpdateWeightRecordInput);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req?: RequestWithUser) {
    return hasUser(req) ? this.service.delete(id, req.user.firmaId) : this.service.delete(id);
  }
}
