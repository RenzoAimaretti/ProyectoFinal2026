import { TaskRepositoryPort } from '../task.ports';

export class FindAllTasksUseCase {
  constructor(private readonly repository: TaskRepositoryPort) {}

  execute(tenantId: string) {
    return this.repository.findAllByTenantId(tenantId);
  }
}
