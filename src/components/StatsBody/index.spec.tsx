import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
import StatsBody from '.';

describe('StatsBody', () => {
  test('renders stats when not loading and stats are present', () => {
    const { container } = render(
      <StatsBody
        currentStats="<p>stats</p>"
        currentTopLanguage="<p>langs</p>"
        isLoading={false}
      />
    );

    expect(container.innerHTML).toMatch('<p>stats</p>');
    expect(container.innerHTML).toMatch('<p>langs</p>');
    expect(
      container.querySelector('[data-testid="spinner"]')
    ).not.toBeInTheDocument();
  });

  test('renders spinner when loading', () => {
    const { container } = render(
      <StatsBody currentStats="" currentTopLanguage="" isLoading={true} />
    );

    expect(
      container.querySelector('[data-testid="spinner"]')
    ).toBeInTheDocument();
  });

  test('renders nothing when not loading and stats are empty', () => {
    const { container } = render(
      <StatsBody currentStats="" currentTopLanguage="" isLoading={false} />
    );

    // The component returns null, so no div should be rendered.
    expect(container.querySelector('div')).toBeNull();
  });
});
