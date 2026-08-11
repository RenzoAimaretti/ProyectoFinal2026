import { TaskTypeRepositoryPort } from '../task-type.ports';

export class FindTaskTypeUseCase {
  constructor(private readonly repository: TaskTypeRepositoryPort) {}

  execute(id: string) {
    return this.repository.findById(id);
  }
}
