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

describe('requestDeviceCode', () => {
  beforeEach(() => {
    axiosMock.post.mockReset();
  });

  test('asks GitHub for a code pair and normalizes it', async () => {
    axiosMock.post.mockResolvedValueOnce({
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
      { headers: expect.objectContaining({ Accept: 'application/json' }) }
    );
  });

  test('reports a rejected OAuth app', async () => {
    axiosMock.post.mockResolvedValueOnce({
      data: { error: 'Not Found', error_description: 'No such app.' },
    });

    await expect(requestDeviceCode('client-id')).rejects.toMatchObject({
      type: StatsErrorType.NETWORK,
      message: 'No such app.',
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
      .mockResolvedValueOnce({ data: { error: 'authorization_pending' } })
      .mockResolvedValueOnce({ data: { error: 'authorization_pending' } })
      .mockResolvedValueOnce({ data: { access_token: 'gho_token' } });

    await expect(pollForAccessToken('client-id', code)).resolves.toBe(
      'gho_token'
    );
    expect(axiosMock.post).toHaveBeenCalledTimes(3);
  });

  test('backs off when GitHub asks it to slow down', async () => {
    axiosMock.post
      .mockResolvedValueOnce({ data: { error: 'slow_down', interval: 0 } })
      .mockResolvedValueOnce({ data: { access_token: 'gho_token' } });

    await expect(pollForAccessToken('client-id', code)).resolves.toBe(
      'gho_token'
    );
  });

  test('stops when the user declines', async () => {
    axiosMock.post.mockResolvedValueOnce({ data: { error: 'access_denied' } });

    await expect(pollForAccessToken('client-id', code)).rejects.toMatchObject({
      type: StatsErrorType.DEVICE_DENIED,
    });
  });

  test('stops when the code expires', async () => {
    axiosMock.post.mockResolvedValueOnce({ data: { error: 'expired_token' } });

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

  test('surfaces an unexpected error verbatim', async () => {
    axiosMock.post.mockResolvedValueOnce({
      data: { error: 'unsupported_grant_type', error_description: 'Nope.' },
    });

    await expect(pollForAccessToken('client-id', code)).rejects.toMatchObject({
      type: StatsErrorType.NETWORK,
      message: 'Nope.',
    });
  });
});
