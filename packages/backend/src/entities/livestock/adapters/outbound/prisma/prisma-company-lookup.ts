import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { COMPANY_LOOKUP, CompanyLookupPort } from '../../../ports/company-lookup.port';

// Adapter delgado de capacidad (D1 Option A, T-F1-06): única verificación de
// existencia de empresa. Reemplazable por COMPANY_REPOSITORY en F2/W1 (T-F2-23).
@Injectable()
export class PrismaCompanyLookup implements CompanyLookupPort {
  constructor(private readonly prisma: PrismaService) {}

  async companyExists(id: string): Promise<boolean> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true },
    });
    return company !== null;
  }
}
