import { Controller, Get, Post, Param, Body, Put } from '@nestjs/common';
import { LotService } from './lot.service';

@Controller('lots')
export class LotController {
  constructor(private readonly service: LotService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body()
    data: {
      name: string;
      farmId: string;
      coords: string;
      area: number;
    },
  ) {
    return this.service.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      farmId?: string;
      coords?: string;
      area?: number;
      active?: boolean;
    },
  ) {
    return this.service.update(id, data);
  }
}
