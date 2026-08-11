import * as argon2 from 'argon2';
import { EntityNotFoundError, InvalidInputError, DuplicateEntityError } from '../../domain/errors';
import { assertRequiredString, assertValidRole } from '../user.validation';
import { CompanyReaderPort, CreateUserInput, UserRepositoryPort } from '../user.ports';

export class CreateUserUseCase {
  constructor(
    private readonly repository: UserRepositoryPort,
    private readonly companyReader: CompanyReaderPort,
  ) {}

  async execute(input: CreateUserInput) {
    assertRequiredString(input.companyId, 'companyId');
    assertRequiredString(input.password, 'password');
    assertValidRole(input.role);

    const userEmail = input.email ?? input.username;
    if (typeof userEmail !== 'string' || userEmail.trim().length === 0) {
      throw new InvalidInputError('email or username is required');
    }

    const company = await this.companyReader.findById(input.companyId);
    if (!company) {
      throw new EntityNotFoundError(`Company with id ${input.companyId} not found`);
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
      companyId: input.companyId,
      email: userEmail,
      ...(input.username ? { username: input.username } : {}),
      passwordHash,
      role: input.role,
      active: input.active ?? true,
    });
  }
}
