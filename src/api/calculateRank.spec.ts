import { calculateRank } from './calculateRank';

describe('calculateRank', () => {
  test('ranks a prolific account highly', () => {
    const { level, percentile } = calculateRank({
      commits: 2000,
      prs: 300,
      issues: 200,
      reviews: 100,
      stars: 5000,
      followers: 1000,
    });

    expect(level).toBe('S');
    expect(percentile).toBeLessThan(1);
  });

  test('ranks an empty account lowest', () => {
    const { level, percentile } = calculateRank({
      commits: 0,
      prs: 0,
      issues: 0,
      reviews: 0,
      stars: 0,
      followers: 0,
    });

    expect(level).toBe('C');
    expect(percentile).toBe(100);
  });

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
