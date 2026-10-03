import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { ClientRepositoryPort } from '../client.ports';
import {
  ClientProfileRecord,
  UpdateClientProfileInput,
} from '../client.types';
import {
  assertRequiredString,
  normalizeNullableString,
} from '../client.validation';

export class UpdateClientProfileUseCase {
  constructor(private readonly repository: ClientRepositoryPort) {}

  async execute(
    userId: string,
    data: UpdateClientProfileInput,
  ): Promise<ClientProfileRecord> {
    const id = assertRequiredString(userId, 'userId');

    const payload: UpdateClientProfileInput = {
      ...(data.firstName !== undefined
        ? { firstName: assertRequiredString(data.firstName, 'firstName') }
        : {}),
      ...(data.lastName !== undefined
        ? { lastName: assertRequiredString(data.lastName, 'lastName') }
        : {}),
      ...(data.phone !== undefined
        ? { phone: normalizeNullableString(data.phone, 'phone') }
        : {}),
      ...(data.address !== undefined
        ? { address: normalizeNullableString(data.address, 'address') }
        : {}),
    };

    if (Object.keys(payload).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    const existing = await this.repository.findByUserId(id);
    if (!existing) {
      throw new EntityNotFoundError(
        'The authenticated user is not linked to a client',
      );
    }

    return this.repository.updateProfileForUserId(id, payload);
  }
}
