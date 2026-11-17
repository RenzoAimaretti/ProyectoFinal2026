import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { INPUT_CATEGORY_REPOSITORY, InputCategoryRepositoryPort } from './application/input-category.ports';
import { PrismaInputCategoryRepository } from './adapters/outbound/prisma-input-category.repository';
import { InputCategoryController } from './input-category.controller';
import { CreateInputCategoryUseCase } from './application/use-cases/create-input-category.use-case';
import { UpdateInputCategoryUseCase } from './application/use-cases/update-input-category.use-case';
import { DeleteInputCategoryUseCase } from './application/use-cases/delete-input-category.use-case';
import { FindInputCategoryUseCase } from './application/use-cases/find-input-category.use-case';
import { FindAllInputCategoriesUseCase } from './application/use-cases/find-all-input-categories.use-case';
@Module({
  imports: [PrismaModule], controllers: [InputCategoryController],
  providers: [
    { provide: INPUT_CATEGORY_REPOSITORY, useClass: PrismaInputCategoryRepository },
    { provide: CreateInputCategoryUseCase, useFactory: (repo: InputCategoryRepositoryPort) => new CreateInputCategoryUseCase(repo), inject: [INPUT_CATEGORY_REPOSITORY] },
    { provide: UpdateInputCategoryUseCase, useFactory: (repo: InputCategoryRepositoryPort) => new UpdateInputCategoryUseCase(repo), inject: [INPUT_CATEGORY_REPOSITORY] },
    { provide: DeleteInputCategoryUseCase, useFactory: (repo: InputCategoryRepositoryPort) => new DeleteInputCategoryUseCase(repo), inject: [INPUT_CATEGORY_REPOSITORY] },
    { provide: FindInputCategoryUseCase, useFactory: (repo: InputCategoryRepositoryPort) => new FindInputCategoryUseCase(repo), inject: [INPUT_CATEGORY_REPOSITORY] },
    { provide: FindAllInputCategoriesUseCase, useFactory: (repo: InputCategoryRepositoryPort) => new FindAllInputCategoriesUseCase(repo), inject: [INPUT_CATEGORY_REPOSITORY] },
  ],
})
export class InputCategoryModule {}
