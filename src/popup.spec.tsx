import '@testing-library/jest-dom';
import { fetchStats, getGitHubUsername } from '@/api';
import { Popup } from '@/popup';
import { getCachedStats, getToken, setCachedStats } from '@/storage';
import { LanguageUnit, StatsErrorType, StatsSource } from '@/types/enums';
import { Stats, StatsError } from '@/types/stats';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const stats: Stats = {
  username: 'testuser',
  name: 'Test User',
  stars: 18,
  publicRepos: 3,
  followers: 12,
  languages: [{ name: 'TypeScript', value: 2, color: '#3178c6' }],
  languageUnit: LanguageUnit.REPOS,
  source: StatsSource.REST,
};

jest.mock('@/api', () => ({
  fetchStats: jest.fn(),
  getGitHubUsername: jest.fn().mockReturnValue('testuser'),
}));

jest.mock('@/storage', () => ({
  getToken: jest.fn(),
  getCachedStats: jest.fn(),
  setCachedStats: jest.fn().mockResolvedValue(undefined),
}));

const fetchStatsMock = fetchStats as jest.MockedFunction<typeof fetchStats>;
const getTokenMock = getToken as jest.MockedFunction<typeof getToken>;
const getCachedStatsMock = getCachedStats as jest.MockedFunction<
  typeof getCachedStats
>;

// StrictMode matches how the popup actually mounts, so the double-invoked
// effect exercises the in-flight guard that protects the 60 requests/hour
// budget.
const renderPopup = () =>
  render(
    <React.StrictMode>
      <ChakraProvider>
        <Popup />
      </ChakraProvider>
    </React.StrictMode>
  );

describe('Popup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getGitHubUsername as jest.Mock).mockReturnValue('testuser');
    getTokenMock.mockResolvedValue('');
    getCachedStatsMock.mockResolvedValue(undefined);
    fetchStatsMock.mockResolvedValue(stats);

    const globalTyped = global as { chrome?: unknown };
    globalTyped.chrome = {
      tabs: {
        query: (
          _: Record<string, unknown>,
          cb: (tabs: { url: string }[]) => void
        ) => cb([{ url: 'https://github.com/testuser' }]),
      },
      runtime: { openOptionsPage: jest.fn() },
    };
  });

  it('fetches stats once for a username, under the StrictMode double mount', async () => {
    renderPopup();

    await waitFor(() => {
      expect(fetchStatsMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchStatsMock).toHaveBeenCalledWith('testuser', undefined);
    expect(getGitHubUsername).toHaveBeenCalledWith(
      'https://github.com/testuser'
    );
  });

  it('caches the result it fetched', async () => {
    renderPopup();

    await waitFor(() => {
      expect(setCachedStats).toHaveBeenCalledWith(stats);
    });
  });

  it('serves a cached result without hitting the API', async () => {
    getCachedStatsMock.mockResolvedValue(stats);

    renderPopup();

    await waitFor(() => {
      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });
    expect(fetchStatsMock).not.toHaveBeenCalled();
  });

  it('passes the saved token to the API', async () => {
    getTokenMock.mockResolvedValue('ghp_secret');

    renderPopup();

    await waitFor(() => {
      expect(fetchStatsMock).toHaveBeenCalledWith('testuser', 'ghp_secret');
    });
    expect(getCachedStatsMock).toHaveBeenCalledWith(
      'testuser',
      StatsSource.GRAPHQL
    );
  });

  it('surfaces a failure instead of rendering an empty body', async () => {
    fetchStatsMock.mockRejectedValue(
      new StatsError(StatsErrorType.RATE_LIMITED, 'limited')
    );

    renderPopup();

    await waitFor(() => {
      expect(screen.getByText('Rate limit reached')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('stats-card')).not.toBeInTheDocument();
  });

  it('offers the options page while no token is saved', async () => {
    renderPopup();

    await waitFor(() => {
      expect(
        screen.getByText('Add a personal access token')
      ).toBeInTheDocument();
    });
  });

  it('hides the token prompt once a token is saved', async () => {
    getTokenMock.mockResolvedValue('ghp_secret');

    renderPopup();

    await waitFor(() => {
      expect(fetchStatsMock).toHaveBeenCalled();
    });
    expect(
      screen.queryByText('Add a personal access token')
    ).not.toBeInTheDocument();
  });
});
