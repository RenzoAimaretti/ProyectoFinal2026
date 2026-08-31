import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { USER_READER, TASK_REPOSITORY } from './application/task.ports';
import { RemoveTaskOperatorUseCase } from './application/use-cases/remove-task-operator.use-case';
import { TaskModule } from './task.module';

describe('TaskModule', () => {
  it('wires RemoveTaskOperatorUseCase with repository and user reader', async () => {
    const repository = {
      findByIdWithOperatorsForCompany: jest.fn().mockResolvedValue({
        operators: [{ id: 'user-1' }],
      }),
      removeOperatorForCompany: jest.fn().mockResolvedValue(undefined),
    };
    const userReader = {
      findByIdForCompany: jest.fn().mockResolvedValue({ id: 'user-1', role: 'OPERARIO' }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [TaskModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(TASK_REPOSITORY)
      .useValue(repository)
      .overrideProvider(USER_READER)
      .useValue(userReader)
      .compile();

    const useCase = moduleRef.get(RemoveTaskOperatorUseCase);

    await expect(useCase.execute('task-1', 'user-1', 'company-1')).resolves.toEqual({
      message: 'Operator with id user-1 removed from task with id task-1 successfully',
    });

    expect(repository.removeOperatorForCompany).toHaveBeenCalledWith(
      'task-1',
      'company-1',
      'user-1',
    );
  });
});
