import { EntityNotFoundError } from '../../domain/errors';
import { UserRepositoryPort } from '../user.ports';

export class FindUserUseCase {
  constructor(private readonly repository: UserRepositoryPort) {}

  async execute(id: string, tenantId: string) {
    const user = await this.repository.findByIdForTenant(id, tenantId);

    if (!user) {
      throw new EntityNotFoundError(`User with id ${id} not found`);
    }

    return user;
  }
}
