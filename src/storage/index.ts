import { StatsSource } from '@/types/enums';
import { Stats } from '@/types/stats';

const TOKEN_KEY = 'githubToken';
const CACHE_PREFIX = 'stats:';

/**
 * Unauthenticated lookups share a 60 requests/hour budget per IP address, so
 * results are reused for a while rather than refetched on every popup open.
 */
export const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  stats: Stats;
  fetchedAt: number;
}

/**
 * `chrome.storage` is absent outside the extension (jsdom in tests), so every
 * accessor degrades to a no-op instead of throwing.
 */
const area = (): chrome.storage.StorageArea | undefined => {
  if (typeof chrome === 'undefined') {
    return undefined;
  }
  return chrome.storage?.local;
};

const read = async <T>(key: string): Promise<T | undefined> => {
  const storage = area();
  if (!storage) {
    return undefined;
  }
  const result = await storage.get(key);
  return result[key] as T | undefined;
};

const write = async (key: string, value: unknown): Promise<void> => {
  const storage = area();
  if (!storage) {
    return;
  }
  await storage.set({ [key]: value });
};

export const getToken = async (): Promise<string> =>
  (await read<string>(TOKEN_KEY)) ?? '';

export const setToken = async (token: string): Promise<void> => {
  await write(TOKEN_KEY, token.trim());
};

export const clearToken = async (): Promise<void> => {
  const storage = area();
  if (!storage) {
    return;
  }
  await storage.remove(TOKEN_KEY);
};

/**
 * Keyed by source as well as username: an unauthenticated result must never be
 * served in place of the richer authenticated one, or vice versa.
 */
const cacheKey = (username: string, source: StatsSource): string =>
  `${CACHE_PREFIX}${source}:${username.toLowerCase()}`;

export const getCachedStats = async (
  username: string,
  source: StatsSource
): Promise<Stats | undefined> => {
  const entry = await read<CacheEntry>(cacheKey(username, source));
  if (!entry || Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    return undefined;
  }
  return entry.stats;
};

export const setCachedStats = async (stats: Stats): Promise<void> => {
  const entry: CacheEntry = { stats, fetchedAt: Date.now() };
  await write(cacheKey(stats.username, stats.source), entry);
};
