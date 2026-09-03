import '@testing-library/jest-dom';
import { validateToken } from '@/api';
import { Options } from '@/options';
import { clearToken, getToken, setToken } from '@/storage';
import { StatsErrorType } from '@/types/enums';
import { StatsError } from '@/types/stats';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

jest.mock('@/api', () => ({
  validateToken: jest.fn(),
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

const renderOptions = () =>
  render(
    <ChakraProvider>
      <Options />
    </ChakraProvider>
  );

describe('Options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTokenMock.mockResolvedValue('');
    validateTokenMock.mockResolvedValue('test_user');
  });

  it('loads the saved token', async () => {
    getTokenMock.mockResolvedValue('ghp_saved');

    renderOptions();

    await waitFor(() => {
      expect(screen.getByLabelText(/personal access token/i)).toHaveValue(
        'ghp_saved'
      );
    });
  });

  it('verifies before saving and reports the login', async () => {
    renderOptions();

    fireEvent.change(screen.getByLabelText(/personal access token/i), {
      target: { value: 'ghp_new' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Authenticated as test_user/)
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

    fireEvent.change(screen.getByLabelText(/personal access token/i), {
      target: { value: 'bad' },
    });
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

  it('clears the saved token', async () => {
    getTokenMock.mockResolvedValue('ghp_saved');

    renderOptions();

    await waitFor(() => {
      expect(screen.getByLabelText(/personal access token/i)).toHaveValue(
        'ghp_saved'
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(screen.getByText(/Token removed/)).toBeInTheDocument();
    });
    expect(clearToken).toHaveBeenCalled();
    expect(screen.getByLabelText(/personal access token/i)).toHaveValue('');
  });
});
