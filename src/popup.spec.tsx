import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { Popup } from '@/popup';
import { getGitHubStats, getGitHubTopLanguage, getGitHubUsername } from '@/api';

jest.mock('@/api', () => ({
  getGitHubStats: jest.fn().mockResolvedValue({ data: 'stats' }),
  getGitHubTopLanguage: jest.fn().mockResolvedValue({ data: 'lang' }),
  getGitHubUsername: jest.fn().mockReturnValue('testuser'),
}));

describe('Popup', () => {
  beforeEach(() => {
    const globalTyped = global as { chrome?: unknown };
    globalTyped.chrome = {
      tabs: {
        query: (
          _: Record<string, unknown>,
          cb: (tabs: { url: string }[]) => void
        ) => cb([{ url: 'https://github.com/testuser' }]),
      },
    };
  });

  it('fetches stats only once', async () => {
    render(
      <ChakraProvider>
        <Popup />
      </ChakraProvider>
    );
    await waitFor(() => {
      expect(getGitHubStats).toHaveBeenCalledTimes(1);
    });
    expect(getGitHubTopLanguage).toHaveBeenCalledTimes(1);
    expect(getGitHubUsername).toHaveBeenCalledTimes(1);
  });
});
