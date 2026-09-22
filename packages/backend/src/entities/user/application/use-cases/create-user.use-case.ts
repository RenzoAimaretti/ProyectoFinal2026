import * as argon2 from 'argon2';
import { EntityNotFoundError, InvalidInputError, DuplicateEntityError } from '../../domain/errors';
import { assertRequiredString, assertValidRole } from '../user.validation';
import { CreateUserInput, TenantReaderPort, UserRepositoryPort } from '../user.ports';

export class CreateUserUseCase {
  constructor(
    private readonly repository: UserRepositoryPort,
    private readonly tenantReader: TenantReaderPort,
  ) {}

  async execute(input: CreateUserInput) {
    assertRequiredString(input.tenantId, 'tenantId');
    assertRequiredString(input.password, 'password');
    assertValidRole(input.role);

    const userEmail = input.email ?? input.username;
    if (typeof userEmail !== 'string' || userEmail.trim().length === 0) {
      throw new InvalidInputError('email or username is required');
    }

    const tenant = await this.tenantReader.findById(input.tenantId);
    if (!tenant) {
      throw new EntityNotFoundError(`Tenant with id ${input.tenantId} not found`);
    }

    const existingByEmail = await this.repository.findByEmail(userEmail);
    if (existingByEmail) {
      throw new DuplicateEntityError('User with this email already exists');
    }

    if (input.username) {
      const existingByUsername = await this.repository.findByUsername(input.username);
      if (existingByUsername) {
        throw new DuplicateEntityError('User with this username already exists');
      }
    }

    const passwordHash = await argon2.hash(input.password);

    return this.repository.create({
      tenantId: input.tenantId,
      email: userEmail,
      ...(input.username ? { username: input.username } : {}),
      passwordHash,
      role: input.role,
      active: input.active ?? true,
    });
  }
}
