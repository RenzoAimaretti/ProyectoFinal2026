import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GetFieldCatalogUseCase } from './application/use-cases/get-field-catalog.use-case';

@Injectable()
export class FieldCatalogService {
  constructor(private readonly getFieldCatalogUseCase: GetFieldCatalogUseCase) {}

  async findFieldCatalog(tenantId: string, companyId: string) {
    try {
      return await this.getFieldCatalogUseCase.execute({ tenantId, companyId });
    } catch (error) {
      console.error('Error reading field catalog:', error);
      throw new InternalServerErrorException('Error reading field catalog');
    }
  }
}
