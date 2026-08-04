import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
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
  create(
    @Body()
    data: {
      livestockId: string;
      operatorId: string;
      weight: number;
      measuredAt: string;
    },
  ) {
    return this.service.create(data);
  }
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: { operatorId?: string; weight?: number; measuredAt?: string },
  ) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
