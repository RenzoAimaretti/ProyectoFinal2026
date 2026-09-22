export const USER_ROLE_VALUES = ['ADMIN', 'OPERARIO', 'SUPERVISOR', 'PRODUCTOR', 'CONTRATISTA', 'VETERINARIO'] as const;

export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];

export type UserRecord = {
  id: string;
  tenantId: string;
  username: string | null;
  email: string;
  passwordHash: string;
  role: UserRoleValue;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type CreateUserInput = {
  tenantId: string;
  username?: string;
  email?: string;
  password: string;
  role: UserRoleValue;
  active?: boolean;
};

export type UpdateUserInput = {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRoleValue;
  active?: boolean;
};

export type CreateUserData = {
  tenantId: string;
  username?: string;
  email: string;
  passwordHash: string;
  role: UserRoleValue;
  active: boolean;
};

export type UpdateUserData = {
  username?: string;
  passwordHash?: string;
  role?: UserRoleValue;
  active?: boolean;
};
