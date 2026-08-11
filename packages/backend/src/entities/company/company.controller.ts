import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CompanyService } from './company.service';

type CreateCompanyBody = {
  name: string;
  cuit: string;
};

type UpdateCompanyBody = {
  name?: string;
  nombre?: string;
  cuit?: string;
  active?: boolean;
  estado?: boolean | string;
};

type AddModuleBody = {
  companyId: string;
  moduleId: string;
};

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
  create(@Body() data: CreateCompanyBody) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateCompanyBody) {
    return this.service.update(id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.nombre !== undefined ? { name: data.nombre } : {}),
      ...(data.cuit !== undefined ? { cuit: data.cuit } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.estado !== undefined
        ? {
            active:
              typeof data.estado === 'boolean'
                ? data.estado
                : ['true', '1', 'activo', 'active'].includes(
                    data.estado.toLowerCase(),
                  ),
          }
        : {}),
    });
  }

  @Post('/add-module')
  addModule(@Body() data: AddModuleBody) {
    return this.service.addModule(data.companyId, data.moduleId);
  }
}
