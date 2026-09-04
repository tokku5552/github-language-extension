import { LanguageUnit, StatsSource } from '@/types/enums';
import { Stats } from '@/types/stats';
import {
  CACHE_TTL_MS,
  clearToken,
  getCachedStats,
  getToken,
  setCachedStats,
  setToken,
} from '.';

const stats: Stats = {
  username: 'Test_User',
  name: 'Test User',
  stars: 18,
  publicRepos: 3,
  followers: 12,
  languages: [],
  languageUnit: LanguageUnit.REPOS,
  source: StatsSource.REST,
};

type Store = Record<string, unknown>;

const mockStorage = (store: Store) => {
  const globalTyped = global as { chrome?: unknown };
  globalTyped.chrome = {
    storage: {
      local: {
        get: jest.fn(async (key: string) => ({ [key]: store[key] })),
        set: jest.fn(async (items: Store) => {
          Object.assign(store, items);
        }),
        remove: jest.fn(async (key: string) => {
          delete store[key];
        }),
      },
    },
  };
};

describe('storage', () => {
  afterEach(() => {
    const globalTyped = global as { chrome?: unknown };
    delete globalTyped.chrome;
    jest.useRealTimers();
  });

  test('round-trips the token', async () => {
    mockStorage({});

    await setToken('  ghp_secret  ');

    expect(await getToken()).toBe('ghp_secret');
  });

  test('clears the token', async () => {
    mockStorage({ githubToken: 'ghp_secret' });

    await clearToken();

    expect(await getToken()).toBe('');
  });

  test('round-trips cached stats case-insensitively', async () => {
    mockStorage({});

    await setCachedStats(stats);

    expect(await getCachedStats('test_user', StatsSource.REST)).toStrictEqual(
      stats
    );
  });

  test('does not serve an unauthenticated result to the authenticated path', async () => {
    mockStorage({});

    await setCachedStats(stats);

    expect(
      await getCachedStats('test_user', StatsSource.GRAPHQL)
    ).toBeUndefined();
  });

  test('expires entries older than the TTL', async () => {
    jest.useFakeTimers();
    mockStorage({});

    await setCachedStats(stats);
    jest.advanceTimersByTime(CACHE_TTL_MS + 1);

    expect(await getCachedStats('test_user', StatsSource.REST)).toBeUndefined();
  });

  test('degrades to a no-op when chrome.storage is unavailable', async () => {
    const globalTyped = global as { chrome?: unknown };
    delete globalTyped.chrome;

    await expect(getToken()).resolves.toBe('');
    await expect(setCachedStats(stats)).resolves.toBeUndefined();
    await expect(
      getCachedStats('test_user', StatsSource.REST)
    ).resolves.toBeUndefined();
  });
});
