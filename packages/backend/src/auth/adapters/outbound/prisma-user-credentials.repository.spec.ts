import { toAuthUserCredentials } from './prisma-user-credentials.repository';

describe('toAuthUserCredentials', () => {
  it('uses the active company membership role instead of the legacy user role', () => {
    const credentials = toAuthUserCredentials({
      id: 'user-1',
      email: 'user@firma.com',
      passwordHash: 'hash',
      tenantId: 'tenant-1',
      active: true,
      deleted: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      mustChangePassword: true,
      companyMemberships: [{ companyId: 'company-1', role: 'OPERARIO' }],
    });

    expect(credentials).toMatchObject({
      firmaId: 'company-1',
      role: 'OPERARIO',
      mustChangePassword: true,
    });
  });
});