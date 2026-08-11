import { UserRepositoryPort } from '../user.ports';

export class FindAllUsersUseCase {
  constructor(private readonly repository: UserRepositoryPort) {}

  execute() {
    return this.repository.findAll();
  }
}
