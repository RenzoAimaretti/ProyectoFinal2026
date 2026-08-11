export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

export class AuthenticationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationFailedError';
  }
}

export class AccountInactiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountInactiveError';
  }
}

export class AccountLockedError extends Error {
  constructor(message: string, public readonly remainingSeconds: number, public readonly remainingMinutes: number) {
    super(message);
    this.name = 'AccountLockedError';
  }
}
