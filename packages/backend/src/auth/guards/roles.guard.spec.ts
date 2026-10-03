import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

function createContext(user: unknown) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  it('allows routes without role metadata', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    expect(guard.canActivate(createContext({ role: 'PRODUCTOR' }))).toBe(true);
  });

  it('allows a user whose role is required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN', 'SUPERVISOR']);

    expect(guard.canActivate(createContext({ role: 'ADMIN' }))).toBe(true);
  });

  it('denies a PRODUCTOR on an admin-only route', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN', 'SUPERVISOR']);

    expect(() => guard.canActivate(createContext({ role: 'PRODUCTOR' }))).toThrow(
      ForbiddenException,
    );
  });

  it('reads the roles metadata key', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);

    guard.canActivate(createContext({ role: 'ADMIN' }));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });
});
