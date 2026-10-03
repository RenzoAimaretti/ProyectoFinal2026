import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LOT_READER,
  RECIPE_INPUT_READER,
  RECIPE_REPOSITORY,
} from './application/recipe.ports';
import { CreateRecipeUseCase } from './application/use-cases/create-recipe.use-case';
import { FindRecipeUseCase } from './application/use-cases/find-recipe.use-case';
import { FindRecipesByLotUseCase } from './application/use-cases/find-recipes-by-lot.use-case';
import { RecipeModule } from './recipe.module';

describe('RecipeModule', () => {
  it('wires every recipe use case through its ports', async () => {
    const repository = {
      create: jest.fn(),
      findByIdForTenant: jest.fn().mockResolvedValue(null),
      findAllByLotForTenant: jest.fn().mockResolvedValue([]),
    };
    const lotReader = {
      findByIdForTenant: jest.fn().mockResolvedValue({ id: 'lot-1' }),
    };
    const inputReader = {
      findExistingIdsForTenant: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [RecipeModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RECIPE_REPOSITORY)
      .useValue(repository)
      .overrideProvider(LOT_READER)
      .useValue(lotReader)
      .overrideProvider(RECIPE_INPUT_READER)
      .useValue(inputReader)
      .compile();

    expect(moduleRef.get(FindRecipesByLotUseCase)).toBeInstanceOf(
      FindRecipesByLotUseCase,
    );
    expect(moduleRef.get(FindRecipeUseCase)).toBeInstanceOf(FindRecipeUseCase);
    expect(moduleRef.get(CreateRecipeUseCase)).toBeInstanceOf(
      CreateRecipeUseCase,
    );

    await expect(
      moduleRef.get(FindRecipesByLotUseCase).execute('lot-1', 'tenant-1'),
    ).resolves.toEqual([]);
    expect(repository.findAllByLotForTenant).toHaveBeenCalledWith(
      'lot-1',
      'tenant-1',
    );
  });
});
