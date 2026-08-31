import { TaskRepositoryPort } from '../task.ports';

export class FindAllTasksUseCase {
  constructor(private readonly repository: TaskRepositoryPort) {}

  execute(companyId: string) {
    return this.repository.findAllByCompanyId(companyId);
  }
}
