export const CLOCK = Symbol('EXPENSE_CLOCK');

export interface ClockPort {
  now(): Date;
}
