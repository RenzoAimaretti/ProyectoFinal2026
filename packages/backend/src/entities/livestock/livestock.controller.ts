import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LivestockStatus } from './domain/livestock-status';
import {
  CreateLivestockInput,
  UpdateLivestockInput,
} from './application/livestock.types';
import { LivestockService } from './livestock.service';

type RequestWithUser = {
  user: {
    firmaId: string;
  };
};

type CreateLivestockBody = Omit<CreateLivestockInput, 'companyId'> & {
  companyId?: string;
};

type UpdateLivestockBody = Omit<UpdateLivestockInput, 'companyId'> & {
  companyId?: string;
  status?: LivestockStatus;
};

@Controller('livestocks')
export class LivestockController {
  constructor(private readonly service: LivestockService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateLivestockBody) {
    const { companyId: _companyId, ...payload } = data;

    return this.service.create(req.user.firmaId, payload as CreateLivestockInput);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
    @Body() data: UpdateLivestockBody,
  ) {
    const { companyId: _companyId, ...payload } = data;

    return this.service.update(id, req.user.firmaId, payload as UpdateLivestockInput);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.service.remove(id, req.user.firmaId);
  }
}
