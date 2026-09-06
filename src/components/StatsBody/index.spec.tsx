import '@testing-library/jest-dom';
import { LanguageUnit, StatsErrorType, StatsSource } from '@/types/enums';
import { Stats, StatsError } from '@/types/stats';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import StatsBody from '.';

const stats: Stats = {
  username: 'test_user',
  name: 'Test User',
  stars: 18,
  publicRepos: 3,
  followers: 12,
  languages: [{ name: 'TypeScript', value: 2, color: '#3178c6' }],
  languageUnit: LanguageUnit.REPOS,
  source: StatsSource.REST,
};

const renderBody = (props: Partial<React.ComponentProps<typeof StatsBody>>) =>
  render(
    <ChakraProvider>
      <StatsBody isLoading={false} {...props} />
    </ChakraProvider>
  );

describe('StatsBody', () => {
  test('renders both cards when stats are present', () => {
    renderBody({ stats });

    expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    expect(screen.getByTestId('top-langs-card')).toBeInTheDocument();
  });

  test('renders spinner when loading', () => {
    const { container } = renderBody({ isLoading: true });

    expect(container.querySelector('.chakra-spinner')).toBeInTheDocument();
  });

  test('renders the error instead of a blank body when a fetch fails', () => {
    renderBody({
      error: new StatsError(StatsErrorType.NETWORK, 'offline'),
    });

    expect(screen.getByText('Could not load stats')).toBeInTheDocument();
    expect(screen.queryByTestId('stats-card')).not.toBeInTheDocument();
  });

  test('prefers the spinner over a stale error while reloading', () => {
    const { container } = renderBody({
      isLoading: true,
      error: new StatsError(StatsErrorType.NETWORK, 'offline'),
    });

    expect(container.querySelector('.chakra-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Could not load stats')).not.toBeInTheDocument();
  });

  test('renders nothing before the first lookup', () => {
    const { container } = renderBody({});

    expect(container.querySelector('div')).toBeNull();
  });
});
