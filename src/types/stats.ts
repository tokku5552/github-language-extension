import { LanguageUnit, StatsErrorType, StatsSource } from './enums';

export interface LanguageStat {
  name: string;
  /** Repository count or byte count, depending on `Stats.languageUnit`. */
  value: number;
  color: string;
}

/**
 * Normalized stats shared by both fetch strategies.
 *
 * Fields that the REST (unauthenticated) path cannot provide are optional.
 * Renderers treat `undefined` as "not available without a token" rather than
 * as zero.
 */
export interface Stats {
  username: string;
  name: string;
  stars: number;
  publicRepos: number;
  followers: number;
  commits?: number;
  prs?: number;
  issues?: number;
  reviews?: number;
  contributedTo?: number;
  rank?: Rank;
  languages: LanguageStat[];
  languageUnit: LanguageUnit;
  source: StatsSource;
}

export interface Rank {
  level: string;
  percentile: number;
}

export class StatsError extends Error {
  readonly type: StatsErrorType;
  /** When the rate limit resets, if the API reported it. */
  readonly resetAt?: Date;

  constructor(type: StatsErrorType, message: string, resetAt?: Date) {
    super(message);
    this.name = 'StatsError';
    this.type = type;
    this.resetAt = resetAt;
    // Required so `instanceof` works after TypeScript downlevels to ES5/ES6.
    Object.setPrototypeOf(this, StatsError.prototype);
  }
}
