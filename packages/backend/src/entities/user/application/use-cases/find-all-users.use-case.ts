import { UserRepositoryPort } from '../user.ports';

export class FindAllUsersUseCase {
  constructor(private readonly repository: UserRepositoryPort) {}

  execute(tenantId: string) {
    return this.repository.findAllByTenantId(tenantId);
  }
}
