import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ModuleEntityService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.module.findMany();
  }

  findOne(id: string) {
    return this.prisma.module.findUnique({ where: { id } });
  }

  findByName(name: string) {
    return this.prisma.module.findFirst({ where: { name } });
  }

  async create(data: {name: string; price: number; version: string;}) {
  try{
    if (!data.name || !data.price || !data.version|| data.price <= 0) {
      throw new Error('Missing required fields: name, price, and version');
    }else if(await this.findByName(data.name)){
      throw new Error('Module with this name already exists');
    }else{
      return this.prisma.module.create({ data });

    }
  }catch(error){
    throw new Error('Error creating module');
  }
}

  async update(id: string, data: {name: string; price: number; version: string;companyId?: string;}) {
    try{
      if (!data.name || !data.price || !data.version) {
      throw new Error('Missing required fields: name, price, and version');
    }else{
      return this.prisma.module.update({ where: { id }, data }); 
    }
    }catch(error){
      throw new Error('Error updating module');
    }
  }
}
