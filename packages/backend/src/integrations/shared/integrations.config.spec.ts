import { readExternalHttpTimeoutMs } from './integrations.config';

describe('readExternalHttpTimeoutMs', () => {
  const originalValue = process.env.EXTERNAL_HTTP_TIMEOUT_MS;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.EXTERNAL_HTTP_TIMEOUT_MS;
    } else {
      process.env.EXTERNAL_HTTP_TIMEOUT_MS = originalValue;
    }
  });

  it('falls back to 8000 when the variable is not set', () => {
    delete process.env.EXTERNAL_HTTP_TIMEOUT_MS;

    expect(readExternalHttpTimeoutMs()).toBe(8000);
  });

  it('falls back to 8000 when the variable is blank', () => {
    process.env.EXTERNAL_HTTP_TIMEOUT_MS = '   ';

    expect(readExternalHttpTimeoutMs()).toBe(8000);
  });

  it('reads a positive number from the environment', () => {
    process.env.EXTERNAL_HTTP_TIMEOUT_MS = '1500';

    expect(readExternalHttpTimeoutMs()).toBe(1500);
  });

  it.each(['abc', '0', '-5', 'NaN'])(
    'fails loudly on the invalid value %p',
    (value) => {
      process.env.EXTERNAL_HTTP_TIMEOUT_MS = value;

      expect(() => readExternalHttpTimeoutMs()).toThrow(
        /EXTERNAL_HTTP_TIMEOUT_MS/,
      );
    },
  );
});
