import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MachineStatus } from '../../../prisma/generated/enums';

@Injectable()
export class MachineUsageService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    try{
      return this.prisma.machineUsage.findMany();
    }catch(error){
      throw new InternalServerErrorException('Error finding all machine usages');
    }
  }

  findOne(id: string) {
    try{
      return this.prisma.machineUsage.findUnique({ where: { id } });
    }catch(error){
      throw new InternalServerErrorException('Error finding machine usage');
    }
  }
  
async update(id: string, data: {initialFuel?: number; finalFuel?: number; usageHours?: number; observations?: string;}) {
    try{
      const existingUsage = await this.prisma.machineUsage.findUnique({ where: { id } });
      if (!existingUsage) {
        throw new InternalServerErrorException(`Machine usage with id ${id} not found`);
      } else {
        const updateData: any = {};
        if (data.initialFuel !== undefined) {
          updateData.initialFuel = data.initialFuel;
        }
        if (data.finalFuel !== undefined) {
          updateData.finalFuel = data.finalFuel;
        }
        if (data.usageHours !== undefined) {
          updateData.usageHours = data.usageHours;
        }
        if (data.observations !== undefined) {
          updateData.observations = data.observations;
        }
        return this.prisma.machineUsage.update({ where: { id }, data: updateData });
      }
    }catch(error){
      throw new InternalServerErrorException('Error updating machine usage');
    }
  }

  async create(data: {machineId: string; taskId: string; operatorId: string; intialFuel:number; }) {
    
    //no comprendo el registro inicial de las horas, obs y combustible final de la tarea
    try{
      
      if (!data.machineId || !data.taskId || !data.operatorId) {
        throw new InternalServerErrorException('Missing required fields: machineId, taskId, operatorId, and intialFuel');
      }
      const existingMachine = await this.prisma.machine.findUnique({ where: { id: data.machineId } });
      const existingTask = await this.prisma.task.findUnique({ where: { id: data.taskId }, include:{ operators:{select:{ id: true }}} });
      const existingOperator = await this.prisma.user.findUnique({ where: { id: data.operatorId } });
      // valido que el operario este incluido en la tarea
      console.log('existingMachine:', existingMachine);
      console.log('existingTask:', existingTask);
      console.log('existingOperator:', existingOperator);
      if (!existingMachine || !existingTask || !existingOperator){
        throw new InternalServerErrorException('Machine, task, or operator not found');
      }else if (!existingTask.operators.some(op => op.id === existingOperator.id)) {
        throw new InternalServerErrorException('Operator is not assigned to the task');
       }else if(existingMachine.status !== MachineStatus.ACTIVA){
        throw new InternalServerErrorException('Machine esta en mantenimiento o inactiva');
       }else{
        //deberiamos incluir el operario?
        const createData = {
          machineId: data.machineId,
          taskId: data.taskId,
          intialFuel: data.intialFuel,
       }
       return this.prisma.machineUsage.create({ data: createData });
      }
    }catch(error){
      //ojo se esta capturando cualquier error, se podria mejorar capturando errores mas especificos
      throw new InternalServerErrorException('Error creating machine usage');
    }
  }
}
