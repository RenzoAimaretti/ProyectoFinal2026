import { randomBytes } from 'node:crypto';
import { DuplicateEntityError, InvalidInputError } from '../../domain/errors';
import {
  ClientPasswordHasherPort,
  ClientRepositoryPort,
} from '../client.ports';
import {
  ClientAccessResult,
  CreateClientWithAccessInput,
} from '../client.types';
import {
  assertPositiveNumber,
  assertRequiredString,
  assertValidEmail,
  normalizeNullableString,
} from '../client.validation';

export type CreateClientWithAccessResult = ClientAccessResult & {
  password: string;
};

export class CreateClientWithAccessUseCase {
  constructor(
    private readonly repository: ClientRepositoryPort,
    private readonly passwordHasher: ClientPasswordHasherPort,
  ) {}

  async execute(
    tenantId: string,
    companyId: string,
    input: CreateClientWithAccessInput,
  ): Promise<CreateClientWithAccessResult> {
    const tenant = assertRequiredString(tenantId, 'tenantId');
    const company = assertRequiredString(companyId, 'companyId');
    const email = assertValidEmail(input.email).toLowerCase();
    const firstName = assertRequiredString(input.firstName, 'firstName');
    const lastName = assertRequiredString(input.lastName, 'lastName');
    const farmName = assertRequiredString(input.farmName, 'farmName');

    if (!Array.isArray(input.lots) || input.lots.length === 0) {
      throw new InvalidInputError('lots must contain at least one lot');
    }

    const lots = input.lots.map((lot, index) => ({
      name: assertRequiredString(lot.name, `lots[${index}].name`),
      area: assertPositiveNumber(lot.area, `lots[${index}].area`),
      coords: normalizeNullableString(lot.coords, `lots[${index}].coords`) ?? null,
    }));

    const password = resolveInitialPassword(input.password);

    const phone = normalizeNullableString(input.phone, 'phone') ?? null;
    const address = normalizeNullableString(input.address, 'address') ?? null;

    const existing = await this.repository.findUserByEmail(email);
    if (existing) {
      throw new DuplicateEntityError('A user with this email already exists');
    }

    const passwordHash = await this.passwordHasher.hash(password);

    const result = await this.repository.createWithAccess({
      tenantId: tenant,
      companyId: company,
      email,
      firstName,
      lastName,
      farmName,
      lots,
      passwordHash,
      phone,
      address,
    });

    return { ...result, password };
  }
}

/**
 * Resolves the initial password without ever hardcoding a secret: an explicit
 * value wins, then the optional `CLIENT_DEFAULT_PASSWORD` env var, otherwise a
 * unique random password is generated and returned once so the admin can share
 * it. The client is forced to change it on first login.
 */
function resolveInitialPassword(provided?: string): string {
  if (typeof provided === 'string' && provided.trim().length > 0) {
    return provided;
  }

  const configured = process.env.CLIENT_DEFAULT_PASSWORD?.trim();
  if (configured) {
    return configured;
  }

  return randomBytes(12).toString('base64url');
}
