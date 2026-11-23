export const CLOCK = Symbol('VALUATION_CLOCK');

export interface ClockPort {
  now(): Date;
}
