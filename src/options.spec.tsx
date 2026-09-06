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

const tokenField = () => screen.getByLabelText(/パーソナルアクセストークン/);

const writeText = jest.fn<Promise<void>, [string]>();

const chromeTabsCreate = () =>
  (global as unknown as { chrome: { tabs: { create: jest.Mock } } }).chrome.tabs
    .create;

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

    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  it('loads the saved token', async () => {
    getTokenMock.mockResolvedValue('ghp_saved');

    renderOptions();

    await waitFor(() => {
      expect(tokenField()).toHaveValue('ghp_saved');
    });
  });

  describe('sign in with GitHub', () => {
    it('shows the code without navigating away from it', async () => {
      // Never resolves: the code is only on screen while approval is pending.
      pollForAccessTokenMock.mockReturnValue(new Promise(() => undefined));

      renderOptions();

      fireEvent.click(
        screen.getByRole('button', { name: 'GitHub でサインイン' })
      );

      await waitFor(() => {
        expect(screen.getByTestId('device-code')).toBeInTheDocument();
      });
      expect(screen.getByText('ABCD-1234')).toBeInTheDocument();
      // Opening GitHub here would send the user to a form asking for a code
      // they had not been shown yet.
      expect(chromeTabsCreate()).not.toHaveBeenCalled();
    });

    it('copies the code before opening GitHub', async () => {
      pollForAccessTokenMock.mockReturnValue(new Promise(() => undefined));

      renderOptions();

      fireEvent.click(
        screen.getByRole('button', { name: 'GitHub でサインイン' })
      );
      await waitFor(() => {
        expect(screen.getByTestId('device-code')).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'コードをコピーして GitHub を開く',
        })
      );

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('ABCD-1234');
      });
      expect(chromeTabsCreate()).toHaveBeenCalledWith({
        url: 'https://github.com/login/device',
      });
    });

    it('still opens GitHub when the clipboard is unavailable', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      pollForAccessTokenMock.mockReturnValue(new Promise(() => undefined));

      renderOptions();

      fireEvent.click(
        screen.getByRole('button', { name: 'GitHub でサインイン' })
      );
      await waitFor(() => {
        expect(screen.getByTestId('device-code')).toBeInTheDocument();
      });
      fireEvent.click(
        screen.getByRole('button', {
          name: 'コードをコピーして GitHub を開く',
        })
      );

      await waitFor(() => {
        expect(chromeTabsCreate()).toHaveBeenCalled();
      });
      // The code stays on screen so it can still be typed by hand.
      expect(screen.getByText('ABCD-1234')).toBeInTheDocument();
    });

    it('stores the token once the user approves', async () => {
      renderOptions();

      fireEvent.click(
        screen.getByRole('button', { name: 'GitHub でサインイン' })
      );

      await waitFor(() => {
        expect(
          screen.getByText('test_user として接続しました。')
        ).toBeInTheDocument();
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

      fireEvent.click(
        screen.getByRole('button', { name: 'GitHub でサインイン' })
      );

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

      fireEvent.click(
        screen.getByRole('button', { name: 'GitHub でサインイン' })
      );

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
      fireEvent.click(
        screen.getByRole('button', { name: 'GitHub でサインイン' })
      );
      await waitFor(() => {
        expect(screen.getByTestId('device-code')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
      fireEvent.click(
        screen.getByRole('button', { name: 'GitHub でサインイン' })
      );
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
      fireEvent.click(
        screen.getByRole('button', { name: 'GitHub でサインイン' })
      );
      await waitFor(() => {
        expect(screen.getByTestId('device-code')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '削除' }));
      await waitFor(() => {
        expect(screen.getByText(/接続を解除しました/)).toBeInTheDocument();
      });

      await act(async () => {
        rejectFirst(
          new StatsError(StatsErrorType.NETWORK, 'Sign-in cancelled.')
        );
      });

      expect(screen.getByText(/接続を解除しました/)).toBeInTheDocument();
    });

    it('is hidden when no OAuth app is configured', async () => {
      clientId = '';

      renderOptions();

      await waitFor(() => {
        expect(tokenField()).toBeInTheDocument();
      });
      expect(
        screen.queryByRole('button', { name: 'GitHub でサインイン' })
      ).not.toBeInTheDocument();
    });
  });

  describe('manual token', () => {
    it('verifies before saving and reports the login', async () => {
      renderOptions();

      fireEvent.change(tokenField(), { target: { value: 'ghp_new' } });
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      await waitFor(() => {
        expect(
          screen.getByText('test_user として接続しました。')
        ).toBeInTheDocument();
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
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      await waitFor(() => {
        expect(
          screen.getByText(/GitHub にトークンを拒否されました/)
        ).toBeInTheDocument();
      });
      expect(setToken).not.toHaveBeenCalled();
    });

    it('refuses to verify an empty token', async () => {
      renderOptions();

      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      await waitFor(() => {
        expect(
          screen.getByText('トークンを入力してください。')
        ).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: '削除' }));

    await waitFor(() => {
      expect(screen.getByText(/接続を解除しました/)).toBeInTheDocument();
    });
    expect(clearToken).toHaveBeenCalled();
    expect(tokenField()).toHaveValue('');
  });
});
