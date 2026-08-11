import { TaskTypeRepositoryPort } from '../task-type.ports';

export class FindAllTaskTypesUseCase {
  constructor(private readonly repository: TaskTypeRepositoryPort) {}

  execute() {
    return this.repository.findAll();
  }
}
