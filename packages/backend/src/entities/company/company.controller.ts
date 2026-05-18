import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CompanyService } from './company.service';
import { Company } from '../../../prisma/generated/client';

@Controller('companies')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: Company) {
    return this.service.create(data);
  }
}
