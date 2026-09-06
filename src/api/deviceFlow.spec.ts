import { StatsErrorType } from '@/types/enums';
import axios from 'axios';
import {
  DeviceCode,
  pollForAccessToken,
  requestDeviceCode,
} from './deviceFlow';

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

const code: DeviceCode = {
  deviceCode: 'device-code',
  userCode: 'ABCD-1234',
  verificationUri: 'https://github.com/login/device',
  expiresIn: 900,
  interval: 0,
};

/**
 * Mimics axios itself: a status the request did not opt into becomes a
 * rejection, so a test can tell whether the code actually asked to read 4xx
 * bodies rather than merely being handed one by a lenient mock.
 */
const respondWith =
  (status: number, data: unknown) =>
  (
    _url: string,
    _body: unknown,
    config?: { validateStatus?: (status: number) => boolean }
  ) => {
    const accepts =
      config?.validateStatus ?? ((code: number) => code >= 200 && code < 300);
    return accepts(status)
      ? Promise.resolve({ status, data })
      : Promise.reject({ isAxiosError: true, response: { status, data } });
  };

describe('requestDeviceCode', () => {
  beforeEach(() => {
    axiosMock.post.mockReset();
  });

  test('asks GitHub for a code pair and normalizes it', async () => {
    axiosMock.post.mockResolvedValueOnce({
      status: 200,
      data: {
        device_code: 'device-code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      },
    });

    await expect(requestDeviceCode('client-id')).resolves.toStrictEqual({
      ...code,
      interval: 5,
    });
    expect(axiosMock.post).toHaveBeenCalledWith(
      'https://github.com/login/device/code',
      { client_id: 'client-id', scope: '' },
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
        validateStatus: expect.any(Function),
      })
    );
  });

  test('explains an unknown client id, which GitHub answers with a 404', async () => {
    // Verified against the live endpoint: an unregistered client ID returns
    // HTTP 404 with {"error":"Not Found"} and no description.
    axiosMock.post.mockImplementationOnce(
      respondWith(404, { error: 'Not Found' }) as never
    );

    await expect(requestDeviceCode('client-id')).rejects.toMatchObject({
      type: StatsErrorType.NETWORK,
      message: expect.stringContaining('device flow enabled'),
    });
  });

  test('prefers the description GitHub supplies', async () => {
    axiosMock.post.mockImplementationOnce(
      respondWith(400, {
        error: 'invalid_request',
        error_description: 'No such app.',
      }) as never
    );

    await expect(requestDeviceCode('client-id')).rejects.toMatchObject({
      message: 'No such app.',
    });
  });

  test('does not blame the OAuth app for a GitHub outage', async () => {
    axiosMock.post.mockImplementationOnce(respondWith(502, '<html>') as never);

    await expect(requestDeviceCode('client-id')).rejects.toMatchObject({
      message: expect.stringContaining('not answering'),
    });
  });

  test('reports an unreachable GitHub', async () => {
    axiosMock.post.mockRejectedValueOnce(new Error('offline'));

    await expect(requestDeviceCode('client-id')).rejects.toMatchObject({
      type: StatsErrorType.NETWORK,
    });
  });
});

describe('pollForAccessToken', () => {
  beforeEach(() => {
    axiosMock.post.mockReset();
  });

  test('keeps polling while authorization is pending', async () => {
    axiosMock.post
      .mockResolvedValueOnce({
        status: 200,
        data: { error: 'authorization_pending' },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { error: 'authorization_pending' },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { access_token: 'gho_token' },
      });

    await expect(pollForAccessToken('client-id', code)).resolves.toBe(
      'gho_token'
    );
    expect(axiosMock.post).toHaveBeenCalledTimes(3);
  });

  describe('interval handling', () => {
    // Real timers would make these tests as slow as the intervals they check.
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('waits the interval GitHub asked for before the first poll', async () => {
      axiosMock.post.mockResolvedValue({
        status: 200,
        data: { access_token: 'gho_token' },
      });

      const promise = pollForAccessToken('client-id', { ...code, interval: 7 });

      await jest.advanceTimersByTimeAsync(6999);
      expect(axiosMock.post).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(2);
      expect(axiosMock.post).toHaveBeenCalledTimes(1);
      await expect(promise).resolves.toBe('gho_token');
    });

    test('adds five seconds when slow_down names no new interval', async () => {
      axiosMock.post
        .mockResolvedValueOnce({ status: 200, data: { error: 'slow_down' } })
        .mockResolvedValueOnce({
          status: 200,
          data: { access_token: 'gho_token' },
        });

      const promise = pollForAccessToken('client-id', { ...code, interval: 5 });

      await jest.advanceTimersByTimeAsync(5000);
      expect(axiosMock.post).toHaveBeenCalledTimes(1);

      // 5 + 5, so nothing happens at the old cadence.
      await jest.advanceTimersByTimeAsync(5000);
      expect(axiosMock.post).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(5000);
      expect(axiosMock.post).toHaveBeenCalledTimes(2);
      await expect(promise).resolves.toBe('gho_token');
    });

    test('honours an interval slow_down restates', async () => {
      axiosMock.post
        .mockResolvedValueOnce({
          status: 200,
          data: { error: 'slow_down', interval: 20 },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { access_token: 'gho_token' },
        });

      const promise = pollForAccessToken('client-id', { ...code, interval: 5 });

      await jest.advanceTimersByTimeAsync(5000);
      expect(axiosMock.post).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(19999);
      expect(axiosMock.post).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(2);
      expect(axiosMock.post).toHaveBeenCalledTimes(2);
      await expect(promise).resolves.toBe('gho_token');
    });

    test('stops once the code lifetime elapses mid-poll', async () => {
      axiosMock.post.mockResolvedValue({
        status: 200,
        data: { error: 'authorization_pending' },
      });

      const settled = pollForAccessToken('client-id', {
        ...code,
        interval: 5,
        expiresIn: 12,
      }).catch((caught) => caught);

      await jest.advanceTimersByTimeAsync(20000);

      expect(await settled).toMatchObject({
        type: StatsErrorType.DEVICE_EXPIRED,
      });
    });
  });

  test('stops when the user declines', async () => {
    axiosMock.post.mockResolvedValueOnce({
      status: 200,
      data: { error: 'access_denied' },
    });

    await expect(pollForAccessToken('client-id', code)).rejects.toMatchObject({
      type: StatsErrorType.DEVICE_DENIED,
    });
  });

  test('stops when the code expires', async () => {
    axiosMock.post.mockResolvedValueOnce({
      status: 200,
      data: { error: 'expired_token' },
    });

    await expect(pollForAccessToken('client-id', code)).rejects.toMatchObject({
      type: StatsErrorType.DEVICE_EXPIRED,
    });
  });

  test('gives up once the code lifetime has passed', async () => {
    await expect(
      pollForAccessToken('client-id', { ...code, expiresIn: -1 })
    ).rejects.toMatchObject({ type: StatsErrorType.DEVICE_EXPIRED });
    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  test('stops when the caller aborts', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      pollForAccessToken('client-id', code, { signal: controller.signal })
    ).rejects.toMatchObject({ type: StatsErrorType.NETWORK });
    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  test('stops immediately when the caller aborts during the wait', async () => {
    const controller = new AbortController();
    axiosMock.post.mockResolvedValue({
      status: 200,
      data: { error: 'authorization_pending' },
    });

    // A 30 second interval would hang the test if the wait were not abortable.
    const promise = pollForAccessToken(
      'client-id',
      { ...code, interval: 30 },
      { signal: controller.signal }
    );
    controller.abort();

    await expect(promise).rejects.toMatchObject({
      type: StatsErrorType.NETWORK,
      message: 'Sign-in cancelled.',
    });
    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  test('does not accept a token that arrives after the cancel', async () => {
    const controller = new AbortController();
    let answer: (value: unknown) => void = () => undefined;
    axiosMock.post.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      })
    );

    const promise = pollForAccessToken('client-id', code, {
      signal: controller.signal,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));

    controller.abort();
    answer({ status: 200, data: { access_token: 'gho_token' } });

    await expect(promise).rejects.toMatchObject({
      message: 'Sign-in cancelled.',
    });
  });

  test('surfaces an unexpected error verbatim', async () => {
    axiosMock.post.mockResolvedValueOnce({
      status: 200,
      data: { error: 'unsupported_grant_type', error_description: 'Nope.' },
    });

    await expect(pollForAccessToken('client-id', code)).rejects.toMatchObject({
      type: StatsErrorType.NETWORK,
      message: 'Nope.',
    });
  });
});
