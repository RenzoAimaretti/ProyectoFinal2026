export const CLOCK = Symbol('TARIFF_CLOCK');

export interface ClockPort {
  now(): Date;
}
