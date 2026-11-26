export const CLOCK = Symbol('PROFITABILITY_CLOCK');

export interface ClockPort {
  now(): Date;
}
