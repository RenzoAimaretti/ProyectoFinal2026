import { UserRepositoryPort } from '../user.ports';

export class FindAllUsersUseCase {
  constructor(private readonly repository: UserRepositoryPort) {}

  execute(companyId: string) {
    return this.repository.findAllByCompanyId(companyId);
  }
}
