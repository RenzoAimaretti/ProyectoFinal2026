import { TaskTypeRepositoryPort } from '../task-type.ports';

export class FindAllTaskTypesUseCase {
  constructor(private readonly repository: TaskTypeRepositoryPort) {}

  execute(companyId: string) {
    return this.repository.findAllByCompanyId(companyId);
  }
}
