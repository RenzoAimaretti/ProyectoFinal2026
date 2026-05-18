import { Controller, Get, Post, Param, Body } from '@nestjs/common';
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
  create(@Body() data: any) {
    return this.service.create(data);
  }
}
