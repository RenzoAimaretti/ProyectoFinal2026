import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RecipeInputReaderPort } from '../../application/recipe.ports';

@Injectable()
export class PrismaRecipeInputReader implements RecipeInputReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findExistingIdsForTenant(
    inputIds: string[],
    tenantId: string,
  ): Promise<string[]> {
    const inputs = await this.prisma.input.findMany({
      where: { id: { in: inputIds }, tenantId },
      select: { id: true },
    });

    return inputs.map((input) => input.id);
  }
}
