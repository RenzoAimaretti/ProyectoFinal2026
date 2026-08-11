import { SetMetadata } from '@nestjs/common';
import { AuthUserRole } from '../application/auth.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AuthUserRole[]) => SetMetadata(ROLES_KEY, roles);
