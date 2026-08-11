import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import {
  CreateWeightRecordInput,
  UpdateWeightRecordInput,
} from './application/weight-record.types';
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
  create(@Body() data: CreateWeightRecordInput) {
    return this.service.create(data);
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateWeightRecordInput) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
