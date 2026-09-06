import '@testing-library/jest-dom';
import { StatsErrorType } from '@/types/enums';
import { StatsError } from '@/types/stats';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ErrorState from '.';

const renderError = (error: StatsError) =>
  render(
    <ChakraProvider>
      <ErrorState error={error} />
    </ChakraProvider>
  );

describe('ErrorState', () => {
  test('explains a missing user', () => {
    renderError(new StatsError(StatsErrorType.NOT_FOUND, 'missing'));

    expect(screen.getByText('User not found')).toBeInTheDocument();
  });

  test('explains rate limiting and points at the token', () => {
    renderError(
      new StatsError(StatsErrorType.RATE_LIMITED, 'limited', new Date(0))
    );

    expect(screen.getByText('Rate limit reached')).toBeInTheDocument();
    expect(screen.getByText(/personal access token/i)).toBeInTheDocument();
  });

  test('explains a rejected token', () => {
    renderError(new StatsError(StatsErrorType.UNAUTHORIZED, 'bad token'));

    expect(screen.getByText('Token rejected')).toBeInTheDocument();
  });

  test('falls back to a generic network message', () => {
    renderError(new StatsError(StatsErrorType.NETWORK, 'offline'));

    expect(screen.getByText('Could not load stats')).toBeInTheDocument();
  });
});
