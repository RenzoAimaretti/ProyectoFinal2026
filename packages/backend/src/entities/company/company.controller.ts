import { Controller, Get, Post, Param, Body, Put } from '@nestjs/common';
import { CompanyService } from './company.service';

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
  async create(@Body() data: { name: string; cuit: string }) {
    return this.service.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: { nombre?: string; cuit?: string; estado?: string },
  ) {
    return this.service.update(id, data);
  }

  @Post('/add-module')
  async addModule(@Body() data: { companyId: string; moduleId: string }) {
    return this.service.addModule(data.companyId, data.moduleId);
  }
}
