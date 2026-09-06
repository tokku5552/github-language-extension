import '@testing-library/jest-dom';
import { pollForAccessToken, requestDeviceCode, validateToken } from '@/api';
import { Options } from '@/options';
import { clearToken, getToken, setToken } from '@/storage';
import { StatsErrorType } from '@/types/enums';
import { StatsError } from '@/types/stats';
import { ChakraProvider } from '@chakra-ui/react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

/** Mutable so a test can render the build that has no OAuth app configured. */
let clientId = 'client-id';

jest.mock('@/config', () => ({
  get GITHUB_OAUTH_CLIENT_ID() {
    return clientId;
  },
  GITHUB_OAUTH_SCOPE: '',
}));

jest.mock('@/api', () => ({
  validateToken: jest.fn(),
  requestDeviceCode: jest.fn(),
  pollForAccessToken: jest.fn(),
}));

jest.mock('@/storage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn().mockResolvedValue(undefined),
  clearToken: jest.fn().mockResolvedValue(undefined),
}));

const validateTokenMock = validateToken as jest.MockedFunction<
  typeof validateToken
>;
const getTokenMock = getToken as jest.MockedFunction<typeof getToken>;
const requestDeviceCodeMock = requestDeviceCode as jest.MockedFunction<
  typeof requestDeviceCode
>;
const pollForAccessTokenMock = pollForAccessToken as jest.MockedFunction<
  typeof pollForAccessToken
>;

const deviceCode = {
  deviceCode: 'device-code',
  userCode: 'ABCD-1234',
  verificationUri: 'https://github.com/login/device',
  expiresIn: 900,
  interval: 5,
};

const renderOptions = () =>
  render(
    <ChakraProvider>
      <Options />
    </ChakraProvider>
  );

const tokenField = () => screen.getByLabelText(/personal access token/i);

describe('Options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clientId = 'client-id';
    getTokenMock.mockResolvedValue('');
    validateTokenMock.mockResolvedValue('test_user');
    requestDeviceCodeMock.mockResolvedValue(deviceCode);
    pollForAccessTokenMock.mockResolvedValue('gho_token');

    const globalTyped = global as { chrome?: unknown };
    globalTyped.chrome = { tabs: { create: jest.fn() } };
  });

  it('loads the saved token', async () => {
    getTokenMock.mockResolvedValue('ghp_saved');

    renderOptions();

    await waitFor(() => {
      expect(tokenField()).toHaveValue('ghp_saved');
    });
  });

  describe('sign in with GitHub', () => {
    it('shows the code and opens the verification page', async () => {
      // Never resolves: the code is only on screen while approval is pending.
      pollForAccessTokenMock.mockReturnValue(new Promise(() => undefined));

      renderOptions();

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByTestId('device-code')).toBeInTheDocument();
      });
      expect(screen.getByText('ABCD-1234')).toBeInTheDocument();
      expect(
        (global as unknown as { chrome: { tabs: { create: jest.Mock } } })
          .chrome.tabs.create
      ).toHaveBeenCalledWith({ url: 'https://github.com/login/device' });
    });

    it('stores the token once the user approves', async () => {
      renderOptions();

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Connected as test_user.')).toBeInTheDocument();
      });
      // The token that reaches storage is the one the poll produced, and it is
      // verified before being written - order included, not just both called.
      expect(validateTokenMock).toHaveBeenCalledWith('gho_token');
      expect(setToken).toHaveBeenCalledWith('gho_token');
      expect(validateTokenMock.mock.invocationCallOrder[0]).toBeLessThan(
        (setToken as jest.Mock).mock.invocationCallOrder[0]
      );
    });

    it('reports a declined authorization', async () => {
      pollForAccessTokenMock.mockRejectedValue(
        new StatsError(
          StatsErrorType.DEVICE_DENIED,
          'Sign-in was declined on GitHub.'
        )
      );

      renderOptions();

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Sign-in was declined on GitHub.')
        ).toBeInTheDocument();
      });
      expect(setToken).not.toHaveBeenCalled();
    });

    it('reports a missing or misconfigured OAuth app', async () => {
      requestDeviceCodeMock.mockRejectedValue(
        new StatsError(StatsErrorType.NETWORK, 'No such app.')
      );

      renderOptions();

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('No such app.')).toBeInTheDocument();
      });
    });

    it('keeps the cancelled attempt from clobbering a new one', async () => {
      let rejectFirst: (reason: unknown) => void = () => undefined;
      pollForAccessTokenMock
        .mockReturnValueOnce(
          new Promise((_resolve, reject) => {
            rejectFirst = reject;
          })
        )
        .mockReturnValue(new Promise(() => undefined));

      renderOptions();
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(screen.getByTestId('device-code')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(screen.getByTestId('device-code')).toBeInTheDocument();
      });

      // The cancelled poll notices its abort only now, well after the restart.
      await act(async () => {
        rejectFirst(
          new StatsError(StatsErrorType.NETWORK, 'Sign-in cancelled.')
        );
      });

      expect(screen.getByTestId('device-code')).toBeInTheDocument();
      expect(screen.queryByText('Sign-in cancelled.')).not.toBeInTheDocument();
    });

    it('keeps the cancelled attempt from clobbering a cleared token', async () => {
      let rejectFirst: (reason: unknown) => void = () => undefined;
      pollForAccessTokenMock.mockReturnValue(
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
        })
      );

      renderOptions();
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(screen.getByTestId('device-code')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
      await waitFor(() => {
        expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
      });

      await act(async () => {
        rejectFirst(
          new StatsError(StatsErrorType.NETWORK, 'Sign-in cancelled.')
        );
      });

      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
    });

    it('is hidden when no OAuth app is configured', async () => {
      clientId = '';

      renderOptions();

      await waitFor(() => {
        expect(tokenField()).toBeInTheDocument();
      });
      expect(
        screen.queryByRole('button', { name: /sign in/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('manual token', () => {
    it('verifies before saving and reports the login', async () => {
      renderOptions();

      fireEvent.change(tokenField(), { target: { value: 'ghp_new' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('Connected as test_user.')).toBeInTheDocument();
      });
      expect(validateTokenMock).toHaveBeenCalledWith('ghp_new');
      expect(setToken).toHaveBeenCalledWith('ghp_new');
    });

    it('does not save a token GitHub rejects', async () => {
      validateTokenMock.mockRejectedValue(
        new StatsError(StatsErrorType.UNAUTHORIZED, 'Token was rejected.')
      );

      renderOptions();

      fireEvent.change(tokenField(), { target: { value: 'bad' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('Token was rejected.')).toBeInTheDocument();
      });
      expect(setToken).not.toHaveBeenCalled();
    });

    it('refuses to verify an empty token', async () => {
      renderOptions();

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('Enter a token first.')).toBeInTheDocument();
      });
      expect(validateTokenMock).not.toHaveBeenCalled();
    });
  });

  it('clears the saved token', async () => {
    getTokenMock.mockResolvedValue('ghp_saved');

    renderOptions();

    await waitFor(() => {
      expect(tokenField()).toHaveValue('ghp_saved');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
    });
    expect(clearToken).toHaveBeenCalled();
    expect(tokenField()).toHaveValue('');
  });
});
