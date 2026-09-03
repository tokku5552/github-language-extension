import '@testing-library/jest-dom';
import { LanguageUnit, StatsSource } from '@/types/enums';
import { Stats } from '@/types/stats';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import StatsCard from '.';

const restStats: Stats = {
  username: 'test_user',
  name: 'Test User',
  stars: 1234,
  publicRepos: 3,
  followers: 12,
  languages: [],
  languageUnit: LanguageUnit.REPOS,
  source: StatsSource.REST,
};

const graphQlStats: Stats = {
  ...restStats,
  commits: 140,
  prs: 25,
  issues: 9,
  reviews: 7,
  contributedTo: 4,
  rank: { level: 'A+', percentile: 8.2 },
  languageUnit: LanguageUnit.BYTES,
  source: StatsSource.GRAPHQL,
};

const renderCard = (stats: Stats) =>
  render(
    <ChakraProvider>
      <StatsCard stats={stats} />
    </ChakraProvider>
  );

describe('StatsCard', () => {
  test('renders the public counts and formats large numbers', () => {
    renderCard(restStats);

    expect(screen.getByText("Test User's GitHub Stats")).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
  });

  test('omits token-only rows and the rank without a token', () => {
    renderCard(restStats);

    expect(screen.queryByText('Total Commits')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rank-circle')).not.toBeInTheDocument();
    expect(
      screen.getByText(/need a personal access token/i)
    ).toBeInTheDocument();
  });

  test('renders the full set and the rank with a token', () => {
    renderCard(graphQlStats);

    expect(screen.getByText('Total Commits')).toBeInTheDocument();
    expect(screen.getByText('Total PRs')).toBeInTheDocument();
    expect(screen.getByText('Contributed to')).toBeInTheDocument();
    expect(screen.getByTestId('rank-circle')).toHaveTextContent('A+');
    expect(
      screen.queryByText(/need a personal access token/i)
    ).not.toBeInTheDocument();
  });
});
