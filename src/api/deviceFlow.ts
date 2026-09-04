import { GITHUB_OAUTH_SCOPE } from '@/config';
import { StatsErrorType } from '@/types/enums';
import { StatsError } from '@/types/stats';
import axios from 'axios';

const DEVICE_CODE_ENDPOINT = 'https://github.com/login/device/code';
const TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';
const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

/**
 * GitHub returns HTML on some error paths unless JSON is requested explicitly,
 * so every call here asks for JSON.
 */
const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export interface DeviceCode {
  /** Secret half of the pair, polled against the token endpoint. */
  deviceCode: string;
  /** Short code the user types into GitHub. */
  userCode: string;
  verificationUri: string;
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Minimum seconds between polls, as dictated by GitHub. */
  interval: number;
}

interface DeviceCodeResponse {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  expires_in?: number;
  interval?: number;
  error?: string;
  error_description?: string;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  interval?: number;
}

const networkError = (message: string): StatsError =>
  new StatsError(StatsErrorType.NETWORK, message);

/**
 * A request these endpoints refuse outright - an unknown client ID, say - comes
 * back as a 4xx carrying a JSON body, which axios would otherwise turn into a
 * rejection that loses the body. Accepting any status keeps it readable. Note
 * that the ordinary polling outcomes (authorization_pending, slow_down,
 * expired_token, access_denied) are not refusals: they arrive with HTTP 200.
 */
const ACCEPT_ANY_STATUS = { validateStatus: () => true };

/** Starts the device flow and returns the code pair to show the user. */
export const requestDeviceCode = async (
  clientId: string
): Promise<DeviceCode> => {
  let status: number;
  let body: DeviceCodeResponse;
  try {
    const response = await axios.post<DeviceCodeResponse>(
      DEVICE_CODE_ENDPOINT,
      { client_id: clientId, scope: GITHUB_OAUTH_SCOPE },
      { headers: JSON_HEADERS, ...ACCEPT_ANY_STATUS }
    );
    status = response.status;
    body = response.data ?? {};
  } catch {
    throw networkError('Could not reach GitHub to start sign-in.');
  }

  if (status >= 500) {
    throw networkError('GitHub is not answering sign-in requests right now.');
  }

  if (!body.device_code || !body.user_code || !body.verification_uri) {
    // An unknown or misconfigured client ID lands here as 404 "Not Found",
    // which says nothing useful on its own.
    throw networkError(
      body.error_description ??
        'GitHub rejected the sign-in request. Check that the OAuth app exists and has the device flow enabled.'
    );
  }

  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri: body.verification_uri,
    expiresIn: body.expires_in ?? 900,
    interval: body.interval ?? 5,
  };
};

const cancelledError = (): StatsError => networkError('Sign-in cancelled.');

/** Sleeps, but gives up as soon as the caller aborts. */
const wait = (seconds: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancelledError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(cancelledError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, seconds * 1000);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

export interface PollOptions {
  /** Aborts the poll loop, e.g. when the user cancels. */
  signal?: AbortSignal;
}

/**
 * Polls until the user approves the code, honouring the interval GitHub asks
 * for. Resolves with the access token.
 */
export const pollForAccessToken = async (
  clientId: string,
  code: DeviceCode,
  { signal }: PollOptions = {}
): Promise<string> => {
  let interval = code.interval;
  const deadline = Date.now() + code.expiresIn * 1000;

  for (;;) {
    if (signal?.aborted) {
      throw cancelledError();
    }
    if (Date.now() >= deadline) {
      throw new StatsError(
        StatsErrorType.DEVICE_EXPIRED,
        'The sign-in code expired. Start again.'
      );
    }

    await wait(interval, signal);

    let status: number;
    let body: TokenResponse;
    try {
      const response = await axios.post<TokenResponse>(
        TOKEN_ENDPOINT,
        {
          client_id: clientId,
          device_code: code.deviceCode,
          grant_type: GRANT_TYPE,
        },
        { headers: JSON_HEADERS, ...ACCEPT_ANY_STATUS, signal }
      );
      status = response.status;
      body = response.data ?? {};
    } catch {
      if (signal?.aborted) {
        throw cancelledError();
      }
      throw networkError('Could not reach GitHub while waiting for approval.');
    }

    // A response that arrives in the same tick as the cancel must not be
    // allowed to store a token the user just backed out of.
    if (signal?.aborted) {
      throw cancelledError();
    }

    if (status >= 500) {
      throw networkError('GitHub is not answering sign-in requests right now.');
    }

    if (body.access_token) {
      return body.access_token;
    }

    switch (body.error) {
      case 'authorization_pending':
        break;
      case 'slow_down':
        // GitHub adds 5 seconds to the interval and may restate it.
        interval = body.interval ?? interval + 5;
        break;
      case 'expired_token':
        throw new StatsError(
          StatsErrorType.DEVICE_EXPIRED,
          'The sign-in code expired. Start again.'
        );
      case 'access_denied':
        throw new StatsError(
          StatsErrorType.DEVICE_DENIED,
          'Sign-in was declined on GitHub.'
        );
      default:
        throw networkError(
          body.error_description ?? 'GitHub refused the sign-in request.'
        );
    }
  }
};
