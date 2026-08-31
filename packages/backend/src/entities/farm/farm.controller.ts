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
import { CreateFarmInput, UpdateFarmInput } from './application/farm.types';
import { FarmService } from './farm.service';

type RequestWithUser = {
  user: {
    firmaId: string;
  };
};

@Controller('farms')
export class FarmController {
  constructor(private readonly service: FarmService) {}

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
  create(@Req() req: RequestWithUser, @Body() data: CreateFarmInput) {
    return this.service.create(req.user.firmaId, {
      name: data.name,
      location: data.location,
      surface: data.surface,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() data: UpdateFarmInput,
  ) {
    return this.service.update(id, req.user.firmaId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.surface !== undefined ? { surface: data.surface } : {}),
    });
  }
}
