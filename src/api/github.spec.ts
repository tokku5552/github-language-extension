import { LanguageUnit, StatsErrorType, StatsSource } from '@/types/enums';
import { StatsError } from '@/types/stats';
import axios from 'axios';
import {
  fetchStats,
  fetchStatsWithGraphQl,
  fetchStatsWithRest,
  getGitHubUsername,
  validateToken,
} from './github';

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

const user = {
  login: 'test_user',
  name: 'Test User',
  public_repos: 3,
  followers: 12,
};

const repos = [
  { fork: false, language: 'TypeScript', stargazers_count: 10 },
  { fork: false, language: 'TypeScript', stargazers_count: 5 },
  { fork: false, language: 'Go', stargazers_count: 1 },
  { fork: false, language: null, stargazers_count: 2 },
  // Forks are excluded from both the star total and the language tally.
  { fork: true, language: 'Ruby', stargazers_count: 100 },
];

/** Builds an axios-shaped rejection, since axios itself is mocked. */
const axiosError = (status: number, headers: Record<string, string> = {}) => {
  axiosMock.isAxiosError.mockReturnValue(true);
  return { isAxiosError: true, response: { status, headers } };
};

describe('fetchStatsWithRest', () => {
  beforeEach(() => {
    axiosMock.get.mockReset();
    axiosMock.post.mockReset();
    axiosMock.isAxiosError.mockReset();
  });

  test('aggregates public counts and primary languages', async () => {
    axiosMock.get
      .mockResolvedValueOnce({ data: user })
      .mockResolvedValueOnce({ data: repos });

    const stats = await fetchStatsWithRest('test_user');

    expect(stats.username).toBe('test_user');
    expect(stats.name).toBe('Test User');
    expect(stats.stars).toBe(18);
    expect(stats.publicRepos).toBe(3);
    expect(stats.followers).toBe(12);
    expect(stats.source).toBe(StatsSource.REST);
    expect(stats.languageUnit).toBe(LanguageUnit.REPOS);
    expect(stats.languages.map((l) => [l.name, l.value])).toStrictEqual([
      ['TypeScript', 2],
      ['Go', 1],
    ]);
  });

  test('leaves token-only fields undefined', async () => {
    axiosMock.get
      .mockResolvedValueOnce({ data: user })
      .mockResolvedValueOnce({ data: repos });

    const stats = await fetchStatsWithRest('test_user');

    expect(stats.commits).toBeUndefined();
    expect(stats.prs).toBeUndefined();
    expect(stats.issues).toBeUndefined();
    expect(stats.rank).toBeUndefined();
  });

  test('stops paginating on a short page', async () => {
    axiosMock.get
      .mockResolvedValueOnce({ data: user })
      .mockResolvedValueOnce({ data: repos });

    await fetchStatsWithRest('test_user');

    expect(axiosMock.get).toHaveBeenCalledTimes(2);
    expect(axiosMock.get).toHaveBeenLastCalledWith(
      'https://api.github.com/users/test_user/repos',
      expect.objectContaining({
        params: { per_page: 100, type: 'owner', page: 1 },
      })
    );
  });

  test('reports a missing user', async () => {
    axiosMock.get.mockRejectedValueOnce(axiosError(404));

    await expect(fetchStatsWithRest('nope')).rejects.toMatchObject({
      type: StatsErrorType.NOT_FOUND,
    });
  });

  test('reports rate limiting with its reset time', async () => {
    axiosMock.get.mockRejectedValueOnce(
      axiosError(403, {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1700000000',
      })
    );

    const error = await fetchStatsWithRest('test_user').catch((e) => e);

    expect(error).toBeInstanceOf(StatsError);
    expect(error.type).toBe(StatsErrorType.RATE_LIMITED);
    expect(error.resetAt).toStrictEqual(new Date(1700000000 * 1000));
  });

  test('treats a response-less failure as a network error', async () => {
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.get.mockRejectedValueOnce({ isAxiosError: true });

    await expect(fetchStatsWithRest('test_user')).rejects.toMatchObject({
      type: StatsErrorType.NETWORK,
    });
  });
});

const graphQlUser = {
  login: 'test_user',
  name: 'Test User',
  followers: { totalCount: 12 },
  contributionsCollection: {
    totalCommitContributions: 100,
    totalPullRequestReviewContributions: 7,
    restrictedContributionsCount: 40,
  },
  repositoriesContributedTo: { totalCount: 4 },
  pullRequests: { totalCount: 25 },
  issues: { totalCount: 9 },
  repositories: {
    totalCount: 3,
    pageInfo: { hasNextPage: false, endCursor: null },
    nodes: [
      {
        stargazerCount: 10,
        languages: {
          edges: [
            { size: 900, node: { name: 'TypeScript', color: '#3178c6' } },
            { size: 100, node: { name: 'CSS', color: null } },
          ],
        },
      },
      {
        stargazerCount: 5,
        languages: {
          edges: [{ size: 200, node: { name: 'Go', color: '#00ADD8' } }],
        },
      },
    ],
  },
};

describe('fetchStatsWithGraphQl', () => {
  beforeEach(() => {
    axiosMock.get.mockReset();
    axiosMock.post.mockReset();
    axiosMock.isAxiosError.mockReset();
  });

  test('returns the full stat set with byte-weighted languages', async () => {
    axiosMock.post.mockResolvedValueOnce({
      data: { data: { user: graphQlUser } },
    });

    const stats = await fetchStatsWithGraphQl('test_user', 'token');

    expect(stats.source).toBe(StatsSource.GRAPHQL);
    expect(stats.languageUnit).toBe(LanguageUnit.BYTES);
    expect(stats.stars).toBe(15);
    expect(stats.prs).toBe(25);
    expect(stats.issues).toBe(9);
    expect(stats.reviews).toBe(7);
    expect(stats.contributedTo).toBe(4);
    // Public commits plus contributions to repositories the viewer cannot see.
    expect(stats.commits).toBe(140);
    expect(stats.rank?.level).toEqual(expect.any(String));
    expect(stats.languages.map((l) => [l.name, l.value])).toStrictEqual([
      ['TypeScript', 900],
      ['Go', 200],
      ['CSS', 100],
    ]);
  });

  test('falls back to a local color when GraphQL omits one', async () => {
    axiosMock.post.mockResolvedValueOnce({
      data: { data: { user: graphQlUser } },
    });

    const stats = await fetchStatsWithGraphQl('test_user', 'token');

    expect(stats.languages.find((l) => l.name === 'CSS')?.color).toBe(
      '#563d7c'
    );
  });

  test('sends the token as a bearer credential', async () => {
    axiosMock.post.mockResolvedValueOnce({
      data: { data: { user: graphQlUser } },
    });

    await fetchStatsWithGraphQl('test_user', 'secret');

    expect(axiosMock.post).toHaveBeenCalledWith(
      'https://api.github.com/graphql',
      expect.objectContaining({
        variables: { login: 'test_user', after: null },
      }),
      { headers: { Authorization: 'bearer secret' } }
    );
  });

  test('follows repository pagination', async () => {
    const firstPage = {
      ...graphQlUser,
      repositories: {
        ...graphQlUser.repositories,
        pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
      },
    };
    axiosMock.post
      .mockResolvedValueOnce({ data: { data: { user: firstPage } } })
      .mockResolvedValueOnce({ data: { data: { user: graphQlUser } } });

    const stats = await fetchStatsWithGraphQl('test_user', 'token');

    expect(axiosMock.post).toHaveBeenCalledTimes(2);
    expect(stats.stars).toBe(30);
  });

  test('maps a NOT_FOUND GraphQL error', async () => {
    axiosMock.post.mockResolvedValueOnce({
      data: { errors: [{ type: 'NOT_FOUND', message: 'Could not resolve' }] },
    });

    await expect(fetchStatsWithGraphQl('nope', 'token')).rejects.toMatchObject({
      type: StatsErrorType.NOT_FOUND,
    });
  });

  test('maps a rejected token', async () => {
    axiosMock.post.mockRejectedValueOnce(axiosError(401));

    await expect(
      fetchStatsWithGraphQl('test_user', 'bad')
    ).rejects.toMatchObject({ type: StatsErrorType.UNAUTHORIZED });
  });
});

describe('fetchStats', () => {
  beforeEach(() => {
    axiosMock.get.mockReset();
    axiosMock.post.mockReset();
    axiosMock.isAxiosError.mockReset();
  });

  test('uses GraphQL when a token is available', async () => {
    axiosMock.post.mockResolvedValueOnce({
      data: { data: { user: graphQlUser } },
    });

    const stats = await fetchStats('test_user', 'token');

    expect(stats.source).toBe(StatsSource.GRAPHQL);
    expect(axiosMock.get).not.toHaveBeenCalled();
  });

  test('falls back to REST without a token', async () => {
    axiosMock.get
      .mockResolvedValueOnce({ data: user })
      .mockResolvedValueOnce({ data: repos });

    const stats = await fetchStats('test_user');

    expect(stats.source).toBe(StatsSource.REST);
    expect(axiosMock.post).not.toHaveBeenCalled();
  });
});

describe('validateToken', () => {
  beforeEach(() => {
    axiosMock.post.mockReset();
    axiosMock.isAxiosError.mockReset();
  });

  test('returns the authenticated login', async () => {
    axiosMock.post.mockResolvedValueOnce({
      data: { data: { viewer: { login: 'test_user' } } },
    });

    await expect(validateToken('token')).resolves.toBe('test_user');
  });

  test('rejects a token GitHub refuses', async () => {
    axiosMock.post.mockRejectedValueOnce(axiosError(401));

    await expect(validateToken('bad')).rejects.toMatchObject({
      type: StatsErrorType.UNAUTHORIZED,
    });
  });
});

describe('getGitHubUsername', () => {
  test.each([
    { url: 'https://github.com/user', expectedResult: 'user' },
    { url: 'invalid-url', expectedResult: '' },
    { url: 'https://example.com', expectedResult: '' },
  ])('with url=$url', ({ url, expectedResult }) => {
    expect(getGitHubUsername(url)).toBe(expectedResult);
  });
});
