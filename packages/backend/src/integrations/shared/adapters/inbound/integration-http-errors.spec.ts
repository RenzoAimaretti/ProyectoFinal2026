import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  EntityNotFoundError,
  InvalidInputError,
  UpstreamError,
  UpstreamParseError,
  UpstreamUnavailableError,
} from '../../domain/errors';
import { translateIntegrationError } from './integration-http-errors';

const UPSTREAM_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-31.42&longitude=-64.18';

function capture(error: unknown): HttpException {
  try {
    translateIntegrationError(error);
  } catch (thrown) {
    return thrown as HttpException;
  }
  throw new Error('translateIntegrationError did not throw');
}

describe('translateIntegrationError', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  it('UpstreamUnavailableError → 503 with a generic message, detail only in the log', () => {
    const thrown = capture(
      new UpstreamUnavailableError(
        `Request to ${UPSTREAM_URL} failed: fetch failed`,
      ),
    );

    expect(thrown).toBeInstanceOf(ServiceUnavailableException);
    expect(thrown.message).not.toContain('open-meteo');
    expect(thrown.message).not.toContain('fetch failed');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(UPSTREAM_URL));
  });

  it.each([
    ['UpstreamError', new UpstreamError(500, UPSTREAM_URL)],
    [
      'UpstreamParseError',
      new UpstreamParseError(`Unexpected payload from ${UPSTREAM_URL}`),
    ],
  ])(
    '%s → 502 with a generic message, detail only in the log',
    (_name, error) => {
      const thrown = capture(error);

      expect(thrown).toBeInstanceOf(BadGatewayException);
      expect(thrown.message).not.toContain('open-meteo');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(UPSTREAM_URL));
    },
  );

  it('EntityNotFoundError → 404 keeping the domain message', () => {
    const thrown = capture(new EntityNotFoundError('Lot not found'));

    expect(thrown).toBeInstanceOf(NotFoundException);
    expect(thrown.message).toBe('Lot not found');
  });

  it('InvalidInputError → 400 keeping the domain message', () => {
    const thrown = capture(
      new InvalidInputError('lat must be a finite number'),
    );

    expect(thrown).toBeInstanceOf(BadRequestException);
    expect(thrown.message).toBe('lat must be a finite number');
  });

  it('rethrows unknown errors untouched', () => {
    const unknown = new Error('boom');

    expect(() => translateIntegrationError(unknown)).toThrow(unknown);
  });
});
