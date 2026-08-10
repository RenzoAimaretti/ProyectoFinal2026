import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MachineStatus } from '../../../prisma/generated/enums';

@Injectable()
export class MachineService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    try{
      return this.prisma.machine.findMany();
    }catch(error){
      throw new InternalServerErrorException('Error fetching machines');
    }
  }

  findOne(id: string) {
    try{
      return this.prisma.machine.findUnique({ where: { id } });
    }catch(error){
      throw new InternalServerErrorException('Error fetching machine');
    }
  }

 async update(id: string, data:{name?: string; brand?: string; entryDate?: string; status?: MachineStatus; maintenanceDate?: string; }) {
  try{
    const existingMachine = await this.prisma.machine.findUnique({ where: { id } });
    if (!existingMachine) {
      throw new InternalServerErrorException(`Machine with id ${id} not found`);
    }
    if (data.entryDate !== undefined) {
      if(isNaN(Date.parse(data.entryDate))) {
        throw new InternalServerErrorException('Invalid date format for entryDate');
      }else{
        data.entryDate = new Date(data.entryDate).toISOString();
      }
    }
    if (data.maintenanceDate !== undefined) {
      if(isNaN(Date.parse(data.maintenanceDate))) {
        throw new InternalServerErrorException('Invalid date format for maintenanceDate');
      }else{
        data.maintenanceDate = new Date(data.maintenanceDate).toISOString();
      }
    }
    const updateData = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.entryDate !== undefined && { entryDate: data.entryDate }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.maintenanceDate !== undefined && { maintenanceDate: data.maintenanceDate }),
    };
    return await this.prisma.machine.update({ where: { id }, data: updateData });
  }catch(error){
    throw new InternalServerErrorException('Error updating machine');
  }
 }

  async create(data: { companyId: string; name: string; brand: string; entryDate: string; }) {
    try{
      if (!data.companyId || !data.name || !data.brand || !data.entryDate) {
        throw new InternalServerErrorException('Missing required fields: companyId, name, brand, and entryDate');
      }
      const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
      if (!company) {
        throw new InternalServerErrorException('Company with this ID does not exist');
      }
      if(isNaN(Date.parse(data.entryDate))) {
        throw new InternalServerErrorException('Invalid date format for entryDate');
      }else{
        data.entryDate = new Date(data.entryDate).toISOString();
        const createData = {
          companyId: data.companyId,
          name: data.name,
          brand: data.brand,
          entryDate: data.entryDate
        };
        return await this.prisma.machine.create({ data: createData });
      }
    }catch(error){
      throw new InternalServerErrorException('Error creating machine');
    }
  }
}
