import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { WeightRecordService } from './weight-record.service';

@Controller('weight-records')
export class WeightRecordController {
  constructor(private readonly service: WeightRecordService) {}

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
