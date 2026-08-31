import { EntityNotFoundError } from '../../domain/errors';
import { UserRepositoryPort } from '../user.ports';

export class FindUserUseCase {
  constructor(private readonly repository: UserRepositoryPort) {}

  async execute(id: string, companyId: string) {
    const user = await this.repository.findByIdForCompany(id, companyId);

    if (!user) {
      throw new EntityNotFoundError(`User with id ${id} not found`);
    }

    return user;
  }
}
