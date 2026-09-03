import { Rank } from '@/types/stats';

/**
 * Rank calculation ported from anuraghazra/github-readme-stats (MIT License),
 * `src/calculateRank.js`, so that a level shown here means the same thing it
 * meant in the cards this extension used to embed.
 */

const exponentialCdf = (x: number): number => 1 - 2 ** -x;

const logNormalCdf = (x: number): number => x / (1 + x);

export interface RankInput {
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  stars: number;
  followers: number;
  /** True when commits span the whole account history rather than one year. */
  allCommits?: boolean;
}

export const calculateRank = ({
  commits,
  prs,
  issues,
  reviews,
  stars,
  followers,
  allCommits = false,
}: RankInput): Rank => {
  const COMMITS_MEDIAN = allCommits ? 1000 : 250;
  const COMMITS_WEIGHT = 2;
  const PRS_MEDIAN = 50;
  const PRS_WEIGHT = 3;
  const ISSUES_MEDIAN = 25;
  const ISSUES_WEIGHT = 1;
  const REVIEWS_MEDIAN = 2;
  const REVIEWS_WEIGHT = 1;
  const STARS_MEDIAN = 50;
  const STARS_WEIGHT = 4;
  const FOLLOWERS_MEDIAN = 10;
  const FOLLOWERS_WEIGHT = 1;

  const TOTAL_WEIGHT =
    COMMITS_WEIGHT +
    PRS_WEIGHT +
    ISSUES_WEIGHT +
    REVIEWS_WEIGHT +
    STARS_WEIGHT +
    FOLLOWERS_WEIGHT;

  const THRESHOLDS = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const LEVELS = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];

  const rank =
    1 -
    (COMMITS_WEIGHT * exponentialCdf(commits / COMMITS_MEDIAN) +
      PRS_WEIGHT * exponentialCdf(prs / PRS_MEDIAN) +
      ISSUES_WEIGHT * exponentialCdf(issues / ISSUES_MEDIAN) +
      REVIEWS_WEIGHT * exponentialCdf(reviews / REVIEWS_MEDIAN) +
      STARS_WEIGHT * logNormalCdf(stars / STARS_MEDIAN) +
      FOLLOWERS_WEIGHT * logNormalCdf(followers / FOLLOWERS_MEDIAN)) /
      TOTAL_WEIGHT;

  const level =
    LEVELS[THRESHOLDS.findIndex((threshold) => rank * 100 <= threshold)];

  return { level, percentile: rank * 100 };
};
