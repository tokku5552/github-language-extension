import { LanguageUnit, StatsErrorType, StatsSource } from '@/types/enums';
import { LanguageStat, Stats, StatsError } from '@/types/stats';
import axios from 'axios';
import { calculateRank } from './calculateRank';
import { getLanguageColor } from './languageColors';

const REST_BASE = 'https://api.github.com';
const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const REPOS_PER_PAGE = 100;
/**
 * Bounded so that a single lookup cannot exhaust the unauthenticated budget of
 * 60 requests per hour.
 */
const MAX_REST_REPO_PAGES = 3;
const MAX_GRAPHQL_REPO_PAGES = 10;
const TOP_LANGUAGE_COUNT = 5;

interface RestUser {
  login: string;
  name: string | null;
  public_repos: number;
  followers: number;
}

interface RestRepo {
  fork: boolean;
  language: string | null;
  stargazers_count: number;
}

const REST_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const toStatsError = (error: unknown): StatsError => {
  if (error instanceof StatsError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      return new StatsError(
        StatsErrorType.NETWORK,
        'Could not reach the GitHub API.'
      );
    }

    const headers = (response.headers ?? {}) as Record<string, string>;
    const remaining = headers['x-ratelimit-remaining'];
    if (
      (response.status === 403 || response.status === 429) &&
      remaining === '0'
    ) {
      const reset = Number(headers['x-ratelimit-reset']);
      return new StatsError(
        StatsErrorType.RATE_LIMITED,
        'GitHub API rate limit exceeded.',
        Number.isFinite(reset) ? new Date(reset * 1000) : undefined
      );
    }
    if (response.status === 401) {
      return new StatsError(
        StatsErrorType.UNAUTHORIZED,
        'The saved personal access token was rejected by GitHub.'
      );
    }
    if (response.status === 404) {
      return new StatsError(
        StatsErrorType.NOT_FOUND,
        'That GitHub user does not exist.'
      );
    }
  }

  return new StatsError(
    StatsErrorType.NETWORK,
    'Could not load stats from GitHub.'
  );
};

/** Sorts a language tally and keeps only the largest entries. */
const toTopLanguages = (totals: Map<string, number>): LanguageStat[] =>
  [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_LANGUAGE_COUNT)
    .map(([name, value]) => ({
      name,
      value,
      color: getLanguageColor(name),
    }));

/**
 * Unauthenticated path. Two to four requests, and no commit/PR/issue totals:
 * those require the GraphQL API, which rejects anonymous requests outright.
 */
export const fetchStatsWithRest = async (username: string): Promise<Stats> => {
  try {
    const { data: user } = await axios.get<RestUser>(
      `${REST_BASE}/users/${encodeURIComponent(username)}`,
      { headers: REST_HEADERS }
    );

    const repos: RestRepo[] = [];
    for (let page = 1; page <= MAX_REST_REPO_PAGES; page += 1) {
      const { data } = await axios.get<RestRepo[]>(
        `${REST_BASE}/users/${encodeURIComponent(username)}/repos`,
        {
          headers: REST_HEADERS,
          params: { per_page: REPOS_PER_PAGE, type: 'owner', page },
        }
      );
      repos.push(...data);
      if (data.length < REPOS_PER_PAGE) {
        break;
      }
    }

    const owned = repos.filter((repo) => !repo.fork);
    const totals = new Map<string, number>();
    owned.forEach((repo) => {
      if (repo.language) {
        totals.set(repo.language, (totals.get(repo.language) ?? 0) + 1);
      }
    });

    return {
      username: user.login,
      name: user.name || user.login,
      stars: owned.reduce((sum, repo) => sum + repo.stargazers_count, 0),
      publicRepos: user.public_repos,
      followers: user.followers,
      languages: toTopLanguages(totals),
      languageUnit: LanguageUnit.REPOS,
      source: StatsSource.REST,
    };
  } catch (error) {
    throw toStatsError(error);
  }
};

const STATS_QUERY = `
  query userStats($login: String!, $after: String) {
    user(login: $login) {
      login
      name
      followers {
        totalCount
      }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
      }
      repositoriesContributedTo(
        first: 1
        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
      ) {
        totalCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      issues(first: 1) {
        totalCount
      }
      repositories(
        first: 100
        after: $after
        ownerAffiliations: OWNER
        isFork: false
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          stargazerCount
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

interface GraphQlUser {
  login: string;
  name: string | null;
  followers: { totalCount: number };
  contributionsCollection: {
    totalCommitContributions: number;
    totalPullRequestReviewContributions: number;
    restrictedContributionsCount: number;
  };
  repositoriesContributedTo: { totalCount: number };
  pullRequests: { totalCount: number };
  issues: { totalCount: number };
  repositories: {
    totalCount: number;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: {
      stargazerCount: number;
      languages: {
        edges: { size: number; node: { name: string; color: string | null } }[];
      };
    }[];
  };
}

interface GraphQlResponse {
  data?: { user: GraphQlUser | null };
  errors?: { type?: string; message: string }[];
}

const assertNoGraphQlErrors = (response: GraphQlResponse): void => {
  const error = response.errors?.[0];
  if (!error) {
    return;
  }
  if (error.type === 'NOT_FOUND') {
    throw new StatsError(
      StatsErrorType.NOT_FOUND,
      'That GitHub user does not exist.'
    );
  }
  if (error.type === 'RATE_LIMITED') {
    throw new StatsError(
      StatsErrorType.RATE_LIMITED,
      'GitHub API rate limit exceeded.'
    );
  }
  throw new StatsError(StatsErrorType.NETWORK, error.message);
};

/** Requests one page of repositories along with the account-level totals. */
const requestStatsPage = async (
  login: string,
  token: string,
  after: string | null
): Promise<GraphQlResponse> => {
  const response = await axios.post<GraphQlResponse>(
    GRAPHQL_ENDPOINT,
    { query: STATS_QUERY, variables: { login, after } },
    { headers: { Authorization: `bearer ${token}` } }
  );
  return response.data;
};

/**
 * Authenticated path. One request per 100 repositories, and the only way to get
 * commit/PR/issue totals, private contributions and byte-weighted languages.
 */
export const fetchStatsWithGraphQl = async (
  username: string,
  token: string
): Promise<Stats> => {
  try {
    const totals = new Map<string, number>();
    const colors = new Map<string, string>();
    let stars = 0;
    let after: string | null = null;
    let user: GraphQlUser | null = null;

    for (let page = 0; page < MAX_GRAPHQL_REPO_PAGES; page += 1) {
      const body = await requestStatsPage(username, token, after);

      assertNoGraphQlErrors(body);
      const current = body.data?.user;
      if (!current) {
        throw new StatsError(
          StatsErrorType.NOT_FOUND,
          'That GitHub user does not exist.'
        );
      }
      user = current;

      current.repositories.nodes.forEach((repo) => {
        stars += repo.stargazerCount;
        repo.languages.edges.forEach((edge) => {
          totals.set(
            edge.node.name,
            (totals.get(edge.node.name) ?? 0) + edge.size
          );
          if (edge.node.color) {
            colors.set(edge.node.name, edge.node.color);
          }
        });
      });

      if (!current.repositories.pageInfo.hasNextPage) {
        break;
      }
      after = current.repositories.pageInfo.endCursor;
    }

    if (!user) {
      throw new StatsError(
        StatsErrorType.NETWORK,
        'GitHub returned an empty response.'
      );
    }

    const contributions = user.contributionsCollection;
    // Mirrors the `count_private=true` behaviour of the cards this replaced:
    // public commits plus contributions to repositories the viewer cannot see.
    const commits =
      contributions.totalCommitContributions +
      contributions.restrictedContributionsCount;
    const reviews = contributions.totalPullRequestReviewContributions;
    const prs = user.pullRequests.totalCount;
    const issues = user.issues.totalCount;
    const followers = user.followers.totalCount;

    return {
      username: user.login,
      name: user.name || user.login,
      stars,
      publicRepos: user.repositories.totalCount,
      followers,
      commits,
      prs,
      issues,
      reviews,
      contributedTo: user.repositoriesContributedTo.totalCount,
      rank: calculateRank({ commits, prs, issues, reviews, stars, followers }),
      languages: toTopLanguages(totals).map((language) => ({
        ...language,
        color: colors.get(language.name) ?? language.color,
      })),
      languageUnit: LanguageUnit.BYTES,
      source: StatsSource.GRAPHQL,
    };
  } catch (error) {
    throw toStatsError(error);
  }
};

/**
 * Confirms a token is accepted by GitHub and returns the login it belongs to.
 * Used by the options page so a typo is reported at save time rather than on
 * the next popup open.
 */
export const validateToken = async (token: string): Promise<string> => {
  try {
    const { data: body } = await axios.post<GraphQlResponse>(
      GRAPHQL_ENDPOINT,
      { query: 'query { viewer { login } }' },
      { headers: { Authorization: `bearer ${token}` } }
    );
    assertNoGraphQlErrors(body);
    const login = (body.data as unknown as { viewer?: { login?: string } })
      ?.viewer?.login;
    if (!login) {
      throw new StatsError(
        StatsErrorType.UNAUTHORIZED,
        'GitHub did not accept the token.'
      );
    }
    return login;
  } catch (error) {
    throw toStatsError(error);
  }
};

/** Picks the richest strategy available for the credentials on hand. */
export const fetchStats = (username: string, token?: string): Promise<Stats> =>
  token ? fetchStatsWithGraphQl(username, token) : fetchStatsWithRest(username);

export const getGitHubUsername = (url: string): string => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'github.com') {
      return urlObj.pathname.split('/')[1];
    }
  } catch {
    // ignore invalid URLs
  }

  return '';
};
