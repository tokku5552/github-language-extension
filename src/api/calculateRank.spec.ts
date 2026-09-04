import { calculateRank } from './calculateRank';

describe('calculateRank', () => {
  // Golden values produced by running anuraghazra/github-readme-stats'
  // src/calculateRank.js directly, so a drift in this port is caught rather
  // than merely looking plausible.
  test.each([
    {
      label: 'prolific',
      input: {
        commits: 2000,
        prs: 300,
        issues: 200,
        reviews: 100,
        stars: 5000,
        followers: 1000,
      },
      level: 'S',
      percentile: 0.9008225041254092,
    },
    {
      label: 'exactly at every median',
      input: {
        commits: 250,
        prs: 50,
        issues: 25,
        reviews: 2,
        stars: 50,
        followers: 10,
      },
      level: 'B+',
      percentile: 50,
    },
    {
      label: 'modest',
      input: {
        commits: 40,
        prs: 3,
        issues: 2,
        reviews: 0,
        stars: 12,
        followers: 4,
      },
      level: 'C',
      percentile: 87.94993593713293,
    },
    {
      label: 'empty',
      input: {
        commits: 0,
        prs: 0,
        issues: 0,
        reviews: 0,
        stars: 0,
        followers: 0,
      },
      level: 'C',
      percentile: 100,
    },
  ])(
    'matches upstream for an $label account',
    ({ input, level, percentile }) => {
      const rank = calculateRank(input);

      expect(rank.level).toBe(level);
      expect(rank.percentile).toBeCloseTo(percentile, 10);
    }
  );

  test('is monotonic in contribution volume', () => {
    const low = calculateRank({
      commits: 10,
      prs: 1,
      issues: 1,
      reviews: 0,
      stars: 5,
      followers: 2,
    });
    const high = calculateRank({
      commits: 500,
      prs: 60,
      issues: 30,
      reviews: 10,
      stars: 200,
      followers: 50,
    });

    expect(high.percentile).toBeLessThan(low.percentile);
  });

  test('raises the commit median when all commits are counted', () => {
    const input = {
      commits: 500,
      prs: 10,
      issues: 5,
      reviews: 2,
      stars: 20,
      followers: 5,
    };

    expect(
      calculateRank({ ...input, allCommits: true }).percentile
    ).toBeGreaterThan(calculateRank(input).percentile);
  });
});
