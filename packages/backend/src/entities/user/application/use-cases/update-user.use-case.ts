import { DuplicateEntityError, EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { assertRequiredString, assertValidRole } from '../user.validation';
import { PasswordHasherPort, UpdateUserInput, UserRepositoryPort } from '../user.ports';

export class UpdateUserUseCase {
  constructor(
    private readonly repository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(id: string, tenantId: string, input: UpdateUserInput) {
    if (!input || Object.keys(input).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    const user = await this.repository.findByIdForTenant(id, tenantId);
    if (!user) {
      throw new EntityNotFoundError(`User with id ${id} not found`);
    }

    if (input.username !== undefined) {
      assertRequiredString(input.username, 'username');

      const existingUser = await this.repository.findByUsername(input.username);
      if (existingUser && existingUser.id !== id) {
        throw new DuplicateEntityError('User with this username already exists');
      }
    }

    if (input.role !== undefined) {
      assertValidRole(input.role);
    }

    const hashedPassword = input.password !== undefined ? await this.passwordHasher.hash(input.password) : undefined;

    return this.repository.updateForTenant(id, tenantId, {
      ...(input.username !== undefined ? { username: input.username } : {}),
      ...(hashedPassword !== undefined ? { passwordHash: hashedPassword } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });
  }
}
