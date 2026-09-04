/**
 * Which GitHub API produced a set of stats.
 *
 * The REST API works without credentials but only exposes public counts, so
 * commit/PR/issue totals and the rank are unavailable. The GraphQL API needs a
 * personal access token and returns the full set.
 */
export const StatsSource = {
  REST: 'rest',
  GRAPHQL: 'graphql',
} as const;

export type StatsSource = (typeof StatsSource)[keyof typeof StatsSource];

/** Unit used by the language breakdown, which differs per source. */
export const LanguageUnit = {
  /** Number of repositories whose primary language is the given one. */
  REPOS: 'repos',
  /** Bytes of code written in the given language. */
  BYTES: 'bytes',
} as const;

export type LanguageUnit = (typeof LanguageUnit)[keyof typeof LanguageUnit];

export const StatsErrorType = {
  NOT_FOUND: 'not_found',
  RATE_LIMITED: 'rate_limited',
  UNAUTHORIZED: 'unauthorized',
  NETWORK: 'network',
  /** The device flow code expired before the user approved it. */
  DEVICE_EXPIRED: 'device_expired',
  /** The user declined the device flow authorization. */
  DEVICE_DENIED: 'device_denied',
} as const;

export type StatsErrorType =
  (typeof StatsErrorType)[keyof typeof StatsErrorType];
