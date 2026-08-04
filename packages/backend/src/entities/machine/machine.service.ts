import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CreateMachineData,
  MachineEntity,
  MachineRepositoryPort,
  MACHINE_REPOSITORY,
  UpdateMachineData,
} from './ports/machine.repository';
import {
  COMPANY_REPOSITORY,
  CompanyRepositoryPort,
} from '../company/ports/company.repository';

// Service refactorizado a puertos (T-F2-56): conserva EXACTAMENTE el contrato
// observable del legacy (mensajes 500 byte-idénticos, REQ-C-01/03). Como en el
// código original, TODAS las validaciones y lecturas cruzadas corren DENTRO del
// try/catch: el catch general REEMPLAZA cualquier error (incluidos los throws
// internos 'Machine with id X not found', 'Company with this ID does not exist',
// 'Invalid date format...') por el mensaje genérico 'Error creating/updating
// machine' — a diferencia de farm, cuyos cross-reads corren fuera del try.
// La lectura cruzada de empresa se resuelve vía el puerto exportado por company
// (COMPANY_REPOSITORY) — REQ-F2-03 / D1.
@Injectable()
export class MachineService {
  constructor(
    @Inject(MACHINE_REPOSITORY)
    private readonly machineRepository: MachineRepositoryPort,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepositoryPort,
  ) {}

  async findAll(): Promise<MachineEntity[]> {
    try {
      return await this.machineRepository.findAll();
    } catch {
      throw new InternalServerErrorException('Error fetching machines');
    }
  }

  async findOne(id: string): Promise<MachineEntity | null> {
    try {
      return await this.machineRepository.findById(id);
    } catch {
      throw new InternalServerErrorException('Error fetching machine');
    }
  }

  async update(id: string, data: UpdateMachineData): Promise<MachineEntity> {
    try {
      const existingMachine = await this.machineRepository.findById(id);
      if (!existingMachine) {
        throw new InternalServerErrorException(
          `Machine with id ${id} not found`,
        );
      }
      let entryDate: string | undefined;
      if (data.entryDate !== undefined) {
        if (isNaN(Date.parse(data.entryDate))) {
          throw new InternalServerErrorException(
            'Invalid date format for entryDate',
          );
        }
        entryDate = new Date(data.entryDate).toISOString();
      }
      let maintenanceDate: string | undefined;
      if (data.maintenanceDate !== undefined) {
        if (isNaN(Date.parse(data.maintenanceDate))) {
          throw new InternalServerErrorException(
            'Invalid date format for maintenanceDate',
          );
        }
        maintenanceDate = new Date(data.maintenanceDate).toISOString();
      }
      const updateData = {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.brand !== undefined && { brand: data.brand }),
        ...(entryDate !== undefined && { entryDate }),
        ...(data.status !== undefined && { status: data.status }),
        ...(maintenanceDate !== undefined && { maintenanceDate }),
      };
      return await this.machineRepository.update(id, updateData);
    } catch {
      throw new InternalServerErrorException('Error updating machine');
    }
  }

  async create(data: CreateMachineData): Promise<MachineEntity> {
    try {
      if (!data.companyId || !data.name || !data.brand || !data.entryDate) {
        throw new InternalServerErrorException(
          'Missing required fields: companyId, name, brand, and entryDate',
        );
      }
      const company = await this.companyRepository.findById(data.companyId);
      if (!company) {
        throw new InternalServerErrorException(
          'Company with this ID does not exist',
        );
      }
      if (isNaN(Date.parse(data.entryDate))) {
        throw new InternalServerErrorException(
          'Invalid date format for entryDate',
        );
      }
      const createData = {
        companyId: data.companyId,
        name: data.name,
        brand: data.brand,
        entryDate: new Date(data.entryDate).toISOString(),
      };
      return await this.machineRepository.create(createData);
    } catch {
      throw new InternalServerErrorException('Error creating machine');
    }
  }
}
