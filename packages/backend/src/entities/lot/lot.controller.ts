import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateLotInput, UpdateLotInput } from './application/lot.types';
import { LotService } from './lot.service';

type RequestWithUser = {
  user: {
    firmaId: string;
  };
};

@Controller('lots')
export class LotController {
  constructor(private readonly service: LotService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateLotInput) {
    return this.service.create(req.user.firmaId, {
      name: data.name,
      farmId: data.farmId,
      coords: data.coords,
      area: data.area,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() data: UpdateLotInput,
  ) {
    return this.service.update(id, req.user.firmaId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.farmId !== undefined ? { farmId: data.farmId } : {}),
      ...(data.coords !== undefined ? { coords: data.coords } : {}),
      ...(data.area !== undefined ? { area: data.area } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    });
  }
}
